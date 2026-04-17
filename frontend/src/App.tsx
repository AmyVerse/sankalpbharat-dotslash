import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SupplyChainDashboard from './components/SupplyChainDashboard';
import DatabaseExplorer from './components/DatabaseExplorer';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';

function App() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage isLogin={isLogin} setIsLogin={setIsLogin} />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/supplychaindashboard" element={<SupplyChainDashboard />} />
        <Route path="/dev/database" element={<DatabaseExplorer />} />
      </Routes>
    </Router>
  );
}

export default App;
