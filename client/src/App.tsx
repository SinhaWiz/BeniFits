import { Route, Routes } from 'react-router';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AiChatPage from './pages/AiChatPage';
import AiWeightLossCoachPage from './pages/AiWeightLossCoachPage';
import AppointmentsPage from './pages/AppointmentsPage';
import ConversationPage from './pages/ConversationPage';
import DietPlannerPage from './pages/DietPlannerPage';
import ExpertDashboardPage from './pages/ExpertDashboardPage';
import ExpertDetailPage from './pages/ExpertDetailPage';
import ExpertsPage from './pages/ExpertsPage';
import FeedPage from './pages/FeedPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NewsPage from './pages/NewsPage';
import NotFoundPage from './pages/NotFoundPage';
import NutritionPage from './pages/NutritionPage';
import ProfilePage from './pages/ProfilePage';
import ProgressPage from './pages/ProgressPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipesPage from './pages/RecipesPage';
import RegisterPage from './pages/RegisterPage';
import ResearchPage from './pages/ResearchPage';
import UserProfilePage from './pages/UserProfilePage';
import VideosPage from './pages/VideosPage';
import WorkoutPlannerPage from './pages/WorkoutPlannerPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="feed" element={<FeedPage />} />
          <Route path="users/:id" element={<UserProfilePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="nutrition" element={<NutritionPage />} />
          <Route path="diet-plan" element={<DietPlannerPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="recipes/:id" element={<RecipeDetailPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="research" element={<ResearchPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="workouts" element={<WorkoutPlannerPage />} />
          <Route path="ai-nutritionist" element={<AiChatPage />} />
          <Route path="ai-weight-loss-coach" element={<AiWeightLossCoachPage />} />
          <Route path="experts" element={<ExpertsPage />} />
          <Route path="experts/:id" element={<ExpertDetailPage />} />
          <Route path="expert/dashboard" element={<ExpertDashboardPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="appointments/:id/messages" element={<ConversationPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
