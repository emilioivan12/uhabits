import { Navigate, Route, Routes } from "react-router-dom";
import { PwaInstallBanner } from "./components/PwaInstallBanner";
import { HabitDetailPage } from "./pages/HabitDetailPage";
import { HabitFormPage } from "./pages/HabitFormPage";
import { ListPage } from "./pages/ListPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <>
      <PwaInstallBanner />
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="/habit/new" element={<HabitFormPage />} />
        <Route path="/habit/:id" element={<HabitDetailPage />} />
        <Route path="/habit/:id/edit" element={<HabitFormPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
