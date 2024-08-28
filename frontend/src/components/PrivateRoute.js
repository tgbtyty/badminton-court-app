import React from 'react';
import { Navigate } from 'react-router-dom';
import config from '../config';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
