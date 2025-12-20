import { RouterProvider } from "@tanstack/react-router";
import { AuthProvider } from "./contexts/AuthContext";
import { router } from "./router";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
