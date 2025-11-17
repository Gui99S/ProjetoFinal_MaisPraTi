"""
WebSocket endpoint for real-time messaging
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
import json
import logging
from datetime import datetime

from app.core.database import get_db
from app.core.websocket import manager
from app.core.security import get_current_user_from_token
from app.models.user import User
from app.models.message import Conversation, ConversationParticipant
from app.services import message_service
from app.services.bot_service import BotService
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time messaging
    
    Client should connect with: ws://localhost:8000/api/ws?token=<access_token>
    
    Message types from client:
    - {"type": "message", "conversation_id": 1, "content": "Hello"}
    - {"type": "typing", "conversation_id": 1, "is_typing": true}
    - {"type": "read", "conversation_id": 1}
    - {"type": "ping"}
    
    Message types to client:
    - {"type": "message", "message": {...}}
    - {"type": "typing", "conversation_id": 1, "user_id": 2, "is_typing": true}
    - {"type": "user_status", "user_id": 2, "status": "online"}
    - {"type": "read_receipt", "conversation_id": 1, "user_id": 2}
    - {"type": "error", "message": "..."}
    - {"type": "pong"}
    """
    
    # Authenticate user from token
    try:
        user = get_current_user_from_token(token, db)
        if not user:
            await websocket.close(code=1008, reason="Invalid token")
            return
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        await websocket.close(code=1008, reason="Authentication failed")
        return
    
    # Connect user
    await manager.connect(websocket, user.id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
                message_type = message_data.get("type")
                
                if message_type == "message":
                    # Send a message
                    conversation_id = message_data.get("conversation_id")
                    content = message_data.get("content", "").strip()
                    
                    if not conversation_id or not content:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Missing conversation_id or content"
                        })
                        continue
                    
                    # Create message in database
                    try:
                        new_message = message_service.create_message(
                            db, conversation_id, user.id, content
                        )
                        
                        # Get conversation participants
                        conversation = db.query(Conversation).filter(
                            Conversation.id == conversation_id
                        ).first()
                        
                        if conversation:
                            participant_ids = [
                                p.user_id for p in conversation.participants 
                                if p.is_active
                            ]
                            
                            # Format message for broadcast
                            message_response = {
                                "type": "message",
                                "message": {
                                    "id": new_message.id,
                                    "conversation_id": new_message.conversation_id,
                                    "sender_id": new_message.sender_id,
                                    "sender": {
                                        "id": new_message.sender.id,
                                        "name": new_message.sender.name,
                                        "slug": new_message.sender.slug,
                                        "avatar": new_message.sender.avatar
                                    },
                                    "content": new_message.content,
                                    "created_at": new_message.created_at.isoformat(),
                                    "is_edited": new_message.is_edited,
                                    "is_deleted": new_message.is_deleted
                                }
                            }
                            
                            # Send to all participants
                            await manager.send_to_conversation(
                                message_response,
                                participant_ids
                            )
                            
                            # REAL-TIME BOT RESPONSE: Check if any bots are in this conversation
                            # and trigger immediate response in background
                            async def trigger_bot_response():
                                try:
                                    # Run bot response in executor to avoid blocking
                                    loop = asyncio.get_event_loop()
                                    bot_response = await loop.run_in_executor(
                                        None,
                                        BotService.trigger_immediate_bot_response,
                                        db,
                                        conversation_id,
                                        new_message.id
                                    )
                                    
                                    if bot_response:
                                        # Broadcast bot response to all participants
                                        bot_message_response = {
                                            "type": "message",
                                            "message": {
                                                "id": bot_response.id,
                                                "conversation_id": bot_response.conversation_id,
                                                "sender_id": bot_response.sender_id,
                                                "sender": {
                                                    "id": bot_response.sender.id,
                                                    "name": bot_response.sender.name,
                                                    "slug": bot_response.sender.slug,
                                                    "avatar": bot_response.sender.avatar
                                                },
                                                "content": bot_response.content,
                                                "created_at": bot_response.created_at.isoformat(),
                                                "is_edited": bot_response.is_edited,
                                                "is_deleted": bot_response.is_deleted
                                            }
                                        }
                                        
                                        await manager.send_to_conversation(
                                            bot_message_response,
                                            participant_ids
                                        )
                                        
                                        logger.info(f"Bot {bot_response.sender.name} responded in real-time to conversation {conversation_id}")
                                
                                except Exception as e:
                                    logger.error(f"Error triggering bot response: {e}")
                            
                            # Trigger bot response asynchronously (non-blocking)
                            asyncio.create_task(trigger_bot_response())
                    
                    except ValueError as e:
                        await websocket.send_json({
                            "type": "error",
                            "message": str(e)
                        })
                
                elif message_type == "typing":
                    # Typing indicator
                    conversation_id = message_data.get("conversation_id")
                    is_typing = message_data.get("is_typing", False)
                    
                    if not conversation_id:
                        continue
                    
                    # Get conversation participants
                    conversation = db.query(Conversation).filter(
                        Conversation.id == conversation_id
                    ).first()
                    
                    if conversation:
                        participant_ids = [
                            p.user_id for p in conversation.participants 
                            if p.is_active
                        ]
                        
                        await manager.broadcast_typing_status(
                            conversation_id, user.id, is_typing, participant_ids
                        )
                
                elif message_type == "read":
                    # Mark messages as read
                    conversation_id = message_data.get("conversation_id")
                    
                    if not conversation_id:
                        continue
                    
                    try:
                        message_service.mark_messages_as_read(
                            db, conversation_id, user.id
                        )
                        
                        # Get conversation participants to notify them
                        conversation = db.query(Conversation).filter(
                            Conversation.id == conversation_id
                        ).first()
                        
                        if conversation:
                            participant_ids = [
                                p.user_id for p in conversation.participants 
                                if p.is_active
                            ]
                            
                            # Broadcast read receipt
                            read_receipt = {
                                "type": "read_receipt",
                                "conversation_id": conversation_id,
                                "user_id": user.id,
                                "timestamp": datetime.utcnow().isoformat()
                            }
                            
                            await manager.send_to_conversation(
                                read_receipt,
                                participant_ids,
                                exclude_sender=True,
                                sender_id=user.id
                            )
                    
                    except ValueError as e:
                        await websocket.send_json({
                            "type": "error",
                            "message": str(e)
                        })
                
                elif message_type == "ping":
                    # Heartbeat
                    await websocket.send_json({"type": "pong"})
                
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Unknown message type: {message_type}"
                    })
            
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format"
                })
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": "Internal server error"
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
        logger.info(f"User {user.id} disconnected")
        # Broadcast offline status
        await manager.broadcast_user_status(user.id, "offline")
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        manager.disconnect(websocket, user.id)
