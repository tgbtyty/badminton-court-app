import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import config from '../config';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();
  console.log('Login attempt with:', { username, password });
  try {
    console.log('Sending request to:', `${config.apiBaseUrl}/login`);
    const response = await axios.post(`${config.apiBaseUrl}/login`, { username, password });
    console.log('Login response:', response.data);
    // Handle successful login here (e.g., store token, redirect)
  } catch (error) {
    console.error('Login error:', error.response ? error.response.data : error.message);
    console.error('Full error object:', error);
    // Handle login error here (e.g., show error message to user)
  }
};
  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
