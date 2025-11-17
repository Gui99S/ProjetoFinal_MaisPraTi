"""
WebSocket connection manager for real-time messaging
"""
from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # user_id -> list of WebSocket connections (multiple tabs/devices)
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Track online users
        self.online_users: Set[int] = set()
        # Track typing status: conversation_id -> set of user_ids currently typing
        self.typing_users: Dict[int, Set[int]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept WebSocket connection and track user"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        self.online_users.add(user_id)
        
        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections[user_id])}")
        
        # Notify all users about this user coming online
        await self.broadcast_user_status(user_id, "online")
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove WebSocket connection and update user status"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            # If user has no more connections, mark as offline
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                self.online_users.discard(user_id)
                logger.info(f"User {user_id} disconnected. Now offline.")
            else:
                logger.info(f"User {user_id} closed one connection. Still has {len(self.active_connections[user_id])} active.")
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send message to a specific user (all their connections)"""
        if user_id in self.active_connections:
            message_json = json.dumps(message)
            disconnected = []
            
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message_json)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected websockets
            for conn in disconnected:
                self.disconnect(conn, user_id)
    
    async def send_to_conversation(self, message: dict, participant_ids: List[int], exclude_sender: bool = False, sender_id: int = None):
        """Send message to all participants in a conversation"""
        for user_id in participant_ids:
            # Skip sender if exclude_sender is True
            if exclude_sender and user_id == sender_id:
                continue
            
            await self.send_personal_message(message, user_id)
    
    async def broadcast_user_status(self, user_id: int, status: str):
        """Broadcast user online/offline status to all connected users"""
        status_message = {
            "type": "user_status",
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to all connected users
        for uid in list(self.active_connections.keys()):
            await self.send_personal_message(status_message, uid)
    
    async def broadcast_typing_status(self, conversation_id: int, user_id: int, is_typing: bool, participant_ids: List[int]):
        """Broadcast typing indicator to conversation participants"""
        if is_typing:
            if conversation_id not in self.typing_users:
                self.typing_users[conversation_id] = set()
            self.typing_users[conversation_id].add(user_id)
        else:
            if conversation_id in self.typing_users:
                self.typing_users[conversation_id].discard(user_id)
                if not self.typing_users[conversation_id]:
                    del self.typing_users[conversation_id]
        
        typing_message = {
            "type": "typing",
            "conversation_id": conversation_id,
            "user_id": user_id,
            "is_typing": is_typing,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to all participants except the typer
        for uid in participant_ids:
            if uid != user_id:
                await self.send_personal_message(typing_message, uid)
    
    def is_user_online(self, user_id: int) -> bool:
        """Check if user is currently online"""
        return user_id in self.online_users
    
    def get_online_users(self) -> List[int]:
        """Get list of all online user IDs"""
        return list(self.online_users)
    
    def get_typing_users(self, conversation_id: int) -> List[int]:
        """Get list of users currently typing in a conversation"""
        return list(self.typing_users.get(conversation_id, set()))


# Global connection manager instance
manager = ConnectionManager()
