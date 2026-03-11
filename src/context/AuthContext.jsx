import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // 'recruiter', 'candidate', or null
  const [userRole, setUserRole] = useState(null);

  const loginAsRecruiter = () => setUserRole('recruiter');
  const loginAsCandidate = () => setUserRole('candidate');
  const logout = () => setUserRole(null);

  return (
    <AuthContext.Provider value={{ userRole, loginAsRecruiter, loginAsCandidate, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
