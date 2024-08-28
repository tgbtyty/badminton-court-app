import React, { useState } from 'react';
import axios from 'axios';
import config from '../config';

function PlayerRegister() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [useDropInPackage, setUseDropInPackage] = useState(false);
  const [packageUses, setPackageUses] = useState(1);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!useDropInPackage) {
      setShowWarning(true);
      return;
    }
    try {
      const response = await axios.post(`${config.apiBaseUrl}/register-player`, { 
        firstName, 
        lastName, 
        useDropInPackage,
        packageUses: useDropInPackage ? packageUses : 0
      });
      setRegistrationResult(response.data);
      setShowResult(true);
    } catch (error) {
      console.error('Player registration error', error);
      alert('Player registration failed. Please try again.');
    }
  };

  const clearResult = () => {
    setRegistrationResult(null);
    setShowResult(false);
    setFirstName('');
    setLastName('');
    setUseDropInPackage(false);
    setPackageUses(1);
  };

  const confirmNonPackageRegistration = () => {
    setShowWarning(false);
    setShowResult(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Player Check-In</h2>
        {!showResult && !showWarning ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div 
              className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer"
              onClick={() => setUseDropInPackage(!useDropInPackage)}
            >
              <div className={`w-6 h-6 mr-2 border-2 rounded flex items-center justify-center ${useDropInPackage ? 'bg-primary border-primary' : 'border-gray-400'}`}>
                {useDropInPackage && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
              <span className="text-lg">Do you have a drop-in package?</span>
            </div>
            {useDropInPackage && (
              <div className="flex items-center justify-between">
                <span className="text-lg">Number of package uses:</span>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setPackageUses(Math.max(1, packageUses - 1))}
                    className="bg-gray-200 text-gray-800 px-3 py-1 rounded-l"
                  >
                    -
                  </button>
                  <span className="bg-gray-100 px-4 py-1">{packageUses}</span>
                  <button
                    type="button"
                    onClick={() => setPackageUses(packageUses + 1)}
                    className="bg-gray-200 text-gray-800 px-3 py-1 rounded-r"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-green-600 transition duration-300"
            >
              Check In
            </button>
          </form>
        ) : showWarning ? (
          <div className="text-center">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
              <p className="font-bold">Warning</p>
              <p>Please confirm with front desk before proceeding.</p>
            </div>
            <button
              onClick={confirmNonPackageRegistration}
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-green-600 transition duration-300 mb-2"
            >
              Confirm Registration
            </button>
            <button
              onClick={() => setShowWarning(false)}
              className="w-full bg-gray-300 text-gray-800 py-2 rounded-md hover:bg-gray-400 transition duration-300"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Registration Successful!</h3>
            <p className="mb-2"><span className="font-semibold">Username:</span> {registrationResult.username}</p>
            <p className="mb-4"><span className="font-semibold">Temporary Password:</span> {registrationResult.tempPassword}</p>
            <button
              onClick={clearResult}
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-green-600 transition duration-300"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerRegister;