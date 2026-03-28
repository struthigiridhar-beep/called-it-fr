import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import Landing from "@/pages/Landing";
import JoinGroup from "@/pages/JoinGroup";
import Home from "@/pages/Home";
import Group from "@/pages/Group";
import JudgeVerdict from "@/pages/JudgeVerdict";
import DisputeRevote from "@/pages/DisputeRevote";
import RoastComposer from "@/pages/RoastComposer";

import OnboardingCreateGroup from "@/pages/OnboardingCreateGroup";
import OnboardingFirstMarket from "@/pages/OnboardingFirstMarket";
import Profile from "@/pages/Profile";
import Notifications from "@/pages/Notifications";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<AuthGuard />}>
              <Route path="/" element={<Landing />} />
              <Route path="/join/:groupId" element={<JoinGroup />} />

              {/* Protected routes */}
              <Route path="/home" element={<Home />} />
              <Route path="/onboarding/create-group" element={<OnboardingCreateGroup />} />
              <Route path="/onboarding/first-market" element={<OnboardingFirstMarket />} />
              <Route path="/group/:groupId" element={<Group />} />
              <Route path="/group/:groupId/judge/:marketId" element={<JudgeVerdict />} />
              <Route path="/group/:groupId/dispute/:disputeId" element={<DisputeRevote />} />
              <Route path="/group/:groupId/roast/:toUserId" element={<RoastComposer />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
