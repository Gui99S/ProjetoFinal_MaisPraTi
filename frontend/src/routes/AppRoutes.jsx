import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import About from '../pages/About';
import Feed from '../pages/Feed';
import UserProfileConfig from '../pages/Profile/UserProfileConfig';
import UserProfile from '../pages/Profile/UserProfile';
import Profile from '../pages/Profile/MainProfile';
import Gallery from '../pages/Profile/Gallery/Gallery';
import Prototype from '../pages/Prototype/Prototype'
import FriendList from '../pages/Profile/FriendList/FriendList'
import MsgHub from '../pages/Profile/Messages/MsgHub'
import DirectMessages from '../pages/Profile/Messages/DirectMessages'
import GroupChat from '../pages/Profile/Messages/GroupChat'
import NewMsg from '../pages/Profile/Messages/NewMsg'
import NewGroup from '../pages/Profile/Messages/NewGroup'
import CommunityList from '../pages/Community/CommunityList'
import Community from '../pages/Community/Community';
import NewCommunity from '../pages/Community/NewCommunity';
import EditCommunity from '../pages/Community/EditCommunity';
import Thread from '../pages/Community/Thread';
import Market from '../pages/Marketplace/Market';
import NewProduct from '../pages/Marketplace/NewProduct';
import Cart from '../pages/Marketplace/Cart';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/feed" element={<Feed />} />
      
      {/* User's own profile routes - must come before /:slug */}
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/settings" element={<UserProfileConfig />} />
      <Route path="/profile/gallery" element={<Gallery />} />
      
      {/* Other users' profiles - slug-based */}
      <Route path="/profile/:slug" element={<UserProfile />} />
      <Route path="/profile/:slug/friends" element={<FriendList />} />
      <Route path="/profile/:slug/gallery" element={<Gallery />} />
      <Route path="/profile/:slug/communities" element={<CommunityList />} />
      
      {/* Legacy route redirect */}
      <Route path="/userProfile" element={<Navigate to="/profile/settings" replace />} />
      
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="/prototype" element={<Prototype />} />
      <Route path="/friends" element={<FriendList />} />
      
      {/* Messages routes - static routes must come before dynamic params */}
      <Route path="/messages" element={<MsgHub />} />
      <Route path="/messages/new" element={<NewMsg />} />
      <Route path="/messages/group/new" element={<NewGroup />} />
      <Route path="/messages/group/:groupId" element={<GroupChat />} />
      <Route path="/messages/:conversationId" element={<DirectMessages />} />
      
      <Route path="/communities" element={<CommunityList />} />
      <Route path="/communities/new" element={<NewCommunity />} />
      <Route path="/communities/:id/edit" element={<EditCommunity />} />
      <Route path="/communities/:id/thread/:threadId" element={<Thread />} />
      <Route path="/communities/:id" element={<Community />} />
      <Route path="/marketplace" element={<Market />} />
      <Route path="/marketplace/new" element={<NewProduct />} />
      <Route path="/marketplace/cart" element={<Cart />} />
    </Routes>
  );
}

export default AppRoutes;