import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "../components/Header";
import CategoryBar from "../components/CategoryBar";
import Footer from "../components/Footer";
import AIAssistant from "../components/AIAssistant";

// Everything inside the marketplace: sticky header, category strip, page content, footer,
// and the floating AI assistant pinned to the bottom-right corner.
export default function MainLayout() {
  const { pathname } = useLocation();

  // Start each new page at the top (but not when only the query string changes, e.g. filters).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <>
      <Header />
      <CategoryBar />
      <main className="site-main">
        <div className="container page">
          <Outlet />
        </div>
      </main>
      <Footer />
      {/* Hidden on the chat page so it never covers the message box; state is kept meanwhile. */}
      <AIAssistant hidden={pathname === "/chat"} />
    </>
  );
}
