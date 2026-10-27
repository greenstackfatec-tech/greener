import { InicioPage } from "./pages/InicioPage.tsx";
import { ProntidaoProvider } from "./providers/ProntidaoProvider.tsx";

export function App() {
  return (
    <ProntidaoProvider>
      <InicioPage />
    </ProntidaoProvider>
  );
}
