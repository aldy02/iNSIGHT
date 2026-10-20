import {
  Route,
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PabrikPage from './pages/PabrikPage';
import PabrikKategoriPage from './pages/PabrikKategoriPage';
import FormUpload from './pages/FormUpload';
import LayoutWrapper from './components/LayoutWrapper';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';
import FormParameter from './pages/FormParameter';
import Summary from './pages/Summary';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      }
    >
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Wajib Login */}
      <Route element={<ProtectedRoute />}>
        <Route element={<LayoutWrapper />}>
          <Route path="/pabrik/:kode" element={<PabrikPage />} />
          <Route path="/pabrik/:kode/:kategori" element={<PabrikKategoriPage />} />

          {/* Admin Only */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/upload" element={<FormUpload />} />
            <Route path="/parameter" element={<FormParameter />} />
            <Route path="/summary" element={<Summary />} />
          </Route>
        </Route>
      </Route>

      {/* Not Found Route */}
      <Route path="*" element={<NotFound />} />
    </Route>
  )
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;