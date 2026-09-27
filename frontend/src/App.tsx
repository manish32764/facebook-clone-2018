import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthProvider';
import { ChatProvider } from '@/context/ChatProvider';
import { RedirectIfAuthenticated, RequireAuth } from '@templates/RequireAuth';
import {
  AdsManagerPage,
  AlbumPage,
  DatingPage,
  EventPage,
  EventsPage,
  FeedPage,
  FriendsPage,
  FundraiserPage,
  FundraisersPage,
  GamePage,
  GamingPage,
  GroupPage,
  GroupsPage,
  JobPage,
  JobsPage,
  ListingPage,
  LoginPage,
  MarketplacePage,
  MemoriesPage,
  MessagesPage,
  NotFoundPage,
  NotificationsPage,
  PageDetailPage,
  PagesPage,
  PokesPage,
  PostPage,
  ProfilePage,
  RegisterPage,
  SavedPage,
  SearchPage,
  SettingsPage,
  WatchPage,
} from '@pages/index';

/** Every signed-in route, so the list below stays one line per page. */
const PRIVATE_ROUTES = [
  { path: '/', element: <FeedPage /> },
  { path: '/profile/:userId', element: <ProfilePage /> },
  { path: '/friends', element: <FriendsPage /> },
  { path: '/messages', element: <MessagesPage /> },
  { path: '/messages/:conversationId', element: <MessagesPage /> },
  { path: '/notifications', element: <NotificationsPage /> },
  { path: '/watch', element: <WatchPage /> },
  { path: '/marketplace', element: <MarketplacePage /> },
  { path: '/marketplace/:listingId', element: <ListingPage /> },
  { path: '/events', element: <EventsPage /> },
  { path: '/events/:eventId', element: <EventPage /> },
  { path: '/groups', element: <GroupsPage /> },
  { path: '/groups/:groupId', element: <GroupPage /> },
  { path: '/saved', element: <SavedPage /> },
  { path: '/memories', element: <MemoriesPage /> },
  { path: '/search', element: <SearchPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/posts/:postId', element: <PostPage /> },
  { path: '/pages', element: <PagesPage /> },
  { path: '/pages/:pageId', element: <PageDetailPage /> },
  { path: '/albums/:albumId', element: <AlbumPage /> },
  { path: '/pokes', element: <PokesPage /> },
  { path: '/fundraisers', element: <FundraisersPage /> },
  { path: '/fundraisers/:fundraiserId', element: <FundraiserPage /> },
  { path: '/gaming', element: <GamingPage /> },
  { path: '/gaming/:game', element: <GamePage /> },
  { path: '/jobs', element: <JobsPage /> },
  { path: '/jobs/:jobId', element: <JobPage /> },
  { path: '/dating', element: <DatingPage /> },
  { path: '/ads', element: <AdsManagerPage /> },
];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Inside the router so a chat head can navigate, outside the routes so
            an open conversation survives moving between pages. */}
        <ChatProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <RedirectIfAuthenticated>
                  <LoginPage />
                </RedirectIfAuthenticated>
              }
            />
            <Route
              path="/register"
              element={
                <RedirectIfAuthenticated>
                  <RegisterPage />
                </RedirectIfAuthenticated>
              }
            />

            {PRIVATE_ROUTES.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<RequireAuth>{route.element}</RequireAuth>}
              />
            ))}

            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ChatProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
