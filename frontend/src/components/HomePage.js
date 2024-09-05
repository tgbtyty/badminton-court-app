import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import config from '../config';
import ThemeColorPicker from './ThemeColorPicker';
import { toast } from 'react-toastify';

function HomePage() {
  const [courts, setCourts] = useState([]);
  const [showLockModal, setShowLockModal] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [lockStartTime, setLockStartTime] = useState('');
  const [lockDuration, setLockDuration] = useState('');
  const [lockReason, setLockReason] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [timeLeft, setTimeLeft] = useState({});
  

  const fetchCourts = useCallback(async () => {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/courts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCourts(response.data);
    } catch (error) {
      console.error('Error fetching courts:', error);
      toast.error('Failed to fetch courts. Please try again.');
    }
  }, []);

  useEffect(() => {
    fetchCourts();
    const interval = setInterval(fetchCourts, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchCourts]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prevTimeLeft => {
        const newTimeLeft = { ...prevTimeLeft };
        courts.forEach(court => {
          if (court.remaining_time !== null) {
            newTimeLeft[court.id] = Math.max(0, (newTimeLeft[court.id] || court.remaining_time) - 1000);
          }
        });
        return newTimeLeft;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [courts]);

  

  const unlockCourt = useCallback(async (courtId) => {
    try {
      await axios.post(`${config.apiBaseUrl}/courts/${courtId}/unlock`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchCourts();
    } catch (error) {
      console.error('Error unlocking court:', error);
    }
  }, [fetchCourts]);

  const checkAndUnlockCourts = useCallback(async () => {
    const now = new Date();
    courts.forEach(async (court) => {
      if (court.locks && court.locks.length > 0) {
        const activeLocks = court.locks.filter(lock => new Date(lock.end_time) > now);
        if (activeLocks.length === 0 && court.is_locked) {
          await unlockCourt(court.id);
        }
      }
    });
  }, [courts, unlockCourt]);

  useEffect(() => {
    fetchCourts();
    const interval = setInterval(() => {
      fetchCourts();
      checkAndUnlockCourts();
    }, 5000); // Refresh and check locks every 5 seconds
    return () => clearInterval(interval);
  }, [fetchCourts, checkAndUnlockCourts]);

  const addCourt = async () => {
    try {
      await axios.post(`${config.apiBaseUrl}/courts`, { name: `Court ${courts.length + 1}` }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchCourts();
    } catch (error) {
      console.error('Error adding court:', error);
    }
  };

  const removeCourt = async (courtId) => {
    try {
      const response = await axios.delete(`${config.apiBaseUrl}/courts/${courtId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.status === 200) {
        setCourts(prevCourts => prevCourts.filter(court => court.id !== courtId));
        toast.success('Court removed successfully');
      } else {
        throw new Error(response.data.message || 'Failed to remove court');
      }
    } catch (error) {
      console.error('Error removing court:', error);
      toast.error(error.response?.data?.message || 'Failed to remove court. Please try again.');
    }
  };

  const openLockModal = (court) => {
    setSelectedCourt(court);
    setShowLockModal(true);
    setLockStartTime('');
    setLockDuration('');
    setLockReason('');
  };

  const lockCourt = async () => {
    try {
      if (!lockStartTime || !lockDuration || !lockReason) {
        throw new Error('Please fill in all fields');
      }

      const today = new Date().toISOString().split('T')[0];
      const startDateTime = new Date(`${today}T${lockStartTime}`);

      if (isNaN(startDateTime.getTime())) {
        throw new Error('Invalid start time');
      }

      const [hours, minutes] = lockDuration.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error('Invalid duration');
      }

      const durationInMinutes = hours * 60 + minutes;
      const endDateTime = new Date(startDateTime.getTime() + durationInMinutes * 60000);

      console.log('Sending lock request:', {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        reason: lockReason
      });

      const response = await axios.post(`${config.apiBaseUrl}/courts/${selectedCourt.id}/lock`, {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        reason: lockReason
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      console.log('Lock court response:', response.data);
      setShowLockModal(false);
      fetchCourts();
    } catch (error) {
      console.error('Error locking court:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      alert(error.message || 'Failed to lock court. Please try again.');
    }
  };

  const removeLock = async (courtId, lockId) => {
    try {
      await axios.delete(`${config.apiBaseUrl}/courts/${courtId}/lock/${lockId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchCourts();
    } catch (error) {
      console.error('Error removing lock:', error);
    }
  };

  const openPlayerRegistration = () => {
    window.open(`${window.location.origin}/player-register`, '_blank');
    window.location.href = '/player-register';
  };

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(courts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCourts(items);
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };


  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  return (
    <div className="min-h-screen bg-gray-100 relative">
      <header className="bg-primary text-white p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Badminton Court Management</h1>
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-2 rounded-full hover:bg-green-600 transition duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>
      <main className="container mx-auto p-4">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Courts</h2>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="courts">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courts.map((court, index) => (
                    <Draggable key={court.id} draggableId={court.id.toString()} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white shadow-md rounded-lg p-4"
                        >
                          <h3 className="text-xl font-semibold mb-2">{court.name}</h3>
                          <p className="mb-2">
                            Status: 
                            <span className={`font-semibold ${court.is_locked ? 'text-red-500' : 'text-green-500'}`}>
                              {court.is_locked ? 'Locked' : 'Available'}
                            </span>
                          </p>
                          {court.current_lock && (
                            <div className="mb-2 p-2 bg-red-100 rounded">
                              <p>Currently locked:</p>
                              <p>From: {formatDateTime(court.current_lock.start_time)}</p>
                              <p>Until: {formatDateTime(court.current_lock.end_time)}</p>
                              <p>Reason: {court.current_lock.reason}</p>
                            </div>
                          )}
                          <p className="mb-2">Active Players: {court.active_players.length}</p>
                          {court.active_players.length > 0 && (
                            <div className="mb-2">
                              <h4 className="font-semibold">Current Players:</h4>
                              <ul>
                                {court.active_players.map((player, playerIndex) => (
                                  <li key={playerIndex}>{player.first_name} {player.last_name}</li>
                                ))}
                              </ul>
                              <p>Time Remaining: {formatTime(timeLeft[court.id] || 0)}</p>
                            </div>
                          )}
                          <p className="mb-2">Waiting Groups: {court.waiting_groups.length}</p>
                          {court.waiting_groups.length > 0 && (
                            <div className="mb-2">
                              <h4 className="font-semibold">Waiting Players:</h4>
                              {court.waiting_groups.map((group, groupIndex) => (
                                <div key={groupIndex} className="mb-2">
                                  <p>Group {groupIndex + 1}:</p>
                                  <ul>
                                    {group.map((player, playerIndex) => (
                                      <li key={playerIndex}>{player.first_name} {player.last_name}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                          {court.future_locks && court.future_locks.length > 0 && (
                            <div className="mb-2">
                              <h4 className="font-semibold">Scheduled Locks:</h4>
                              <ul>
                                {court.future_locks.map((lock) => (
                                  <li key={lock.id} className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded">
                                    <span>
                                      {formatDateTime(lock.start_time)} - {formatDateTime(lock.end_time)}
                                      <br />
                                      Reason: {lock.reason}
                                    </span>
                                    <button
                                      onClick={() => removeLock(court.id, lock.id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      Remove
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {court.future_locks && court.future_locks.length > 0 && (
                            <div className="mb-2">
                              <h4 className="font-semibold">Scheduled Locks:</h4>
                              <ul>
                                {court.future_locks.map((lock) => (
                                  <li key={lock.id} className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded">
                                    <span>
                                      {formatDateTime(lock.start_time)} - {formatDateTime(lock.end_time)}
                                      <br />
                                      Reason: {lock.reason}
                                    </span>
                                    <button
                                      onClick={() => removeLock(court.id, lock.id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      Remove
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="flex space-x-2 mt-4">
                            <button
                              onClick={() => openLockModal(court)}
                              className="bg-primary text-white px-4 py-2 rounded hover:bg-green-600 transition duration-300"
                            >
                              Lock Court
                            </button>
                            {court.is_locked && (
                              <button
                                onClick={() => unlockCourt(court.id)}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-300"
                              >
                                Unlock Court
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to remove this court?')) {
                                  removeCourt(court.id);
                                }
                              }}
                              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-300"
                            >
                              Remove Court
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
        <div className="flex space-x-4 mb-8">
          <button
            onClick={addCourt}
            className="bg-primary text-white px-6 py-2 rounded hover:bg-green-600 transition duration-300"
          >
            Add Court
          </button>
        </div>
        <div className="flex flex-col space-y-4">
          <a
            href="/player-register"
            onClick={openPlayerRegistration}
            className="bg-primary text-white px-6 py-2 rounded hover:bg-green-600 transition duration-300 text-center"
          >
            Player Registration Page
          </a>
          <Link
            to="/players-list"
            className="bg-primary text-white px-6 py-2 rounded hover:bg-green-600 transition duration-300 text-center"
          >
            Players List
          </Link>
          <Link
            to="/courts"
            className="bg-primary text-white px-6 py-2 rounded hover:bg-green-600 transition duration-300 text-center"
          >
            Courts Page
          </Link>
        </div>
      </main>
      {showLockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Lock Court</h2>
            <input
              type="time"
              value={lockStartTime}
              onChange={(e) => setLockStartTime(e.target.value)}
              className="block w-full mb-4 p-2 border rounded"
            />
            <input
              type="time"
              value={lockDuration}
              onChange={(e) => setLockDuration(e.target.value)}
              className="block w-full mb-4 p-2 border rounded"
            />
            <input
              type="text"
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              placeholder="Reason for locking"
              className="block w-full mb-4 p-2 border rounded"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowLockModal(false)}
                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 transition duration-300"
              >
                Cancel
              </button>
              <button
                onClick={lockCourt}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-green-600 transition duration-300"
              >
                Lock
              </button>
            </div>
          </div>
        </div>
      )}
      {showColorPicker && (
        <div className="absolute top-16 right-4 z-10">
          <ThemeColorPicker />
        </div>
      )}
    </div>
  );
}

export default HomePage;