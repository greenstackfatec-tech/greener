import { RouterProvider } from "react-router";
import { ProntidaoProvider } from "./providers/ProntidaoProvider.tsx";
import { router } from "./rotas.tsx";

export function App() {
  return (
    <ProntidaoProvider>
      <RouterProvider router={router} />
    </ProntidaoProvider>
  );
}
