import React, { useState } from 'react';
import { Power, Plus, Monitor, Smartphone, Server, HardDrive, Cpu, Wifi, Trash2 } from 'lucide-react';

const NetworkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20">
    <path fill="currentColor" d="M10 20a10 10 0 1 1 0-20a10 10 0 0 1 0 20m7.75-8a8 8 0 0 0 0-4h-3.82a29 29 0 0 1 0 4zm-.82 2h-3.22a14.4 14.4 0 0 1-.95 3.51A8.03 8.03 0 0 0 16.93 14m-8.85-2h3.84a24.6 24.6 0 0 0 0-4H8.08a24.6 24.6 0 0 0 0 4m.25 2c.41 2.4 1.13 4 1.67 4s1.26-1.6 1.67-4zm-6.08-2h3.82a29 29 0 0 1 0-4H2.25a8 8 0 0 0 0 4m.82 2a8.03 8.03 0 0 0 4.17 3.51c-.42-.96-.74-2.16-.95-3.51zm13.86-8a8.03 8.03 0 0 0-4.17-3.51c.42.96.74 2.16.95 3.51zm-8.6 0h3.34c-.41-2.4-1.13-4-1.67-4S8.74 3.6 8.33 6M3.07 6h3.22c.2-1.35.53-2.55.95-3.51A8.03 8.03 0 0 0 3.07 6" />
  </svg>
);

const MinecraftServerPanel = () => {
  const [servers, setServers] = useState([
    {
      id: 1,
      name: 'Survival World',
      iconColor: '#10b981',
      isRunning: true,
      deviceType: 'desktop',
      deviceInfo: 'PC - 192.168.1.100',
      players: 12,
      maxPlayers: 20,
      cpu: '45%',
      ram: '3.2GB'
    },
    {
      id: 2,
      name: 'Creative Build',
      iconColor: '#3b82f6',
      isRunning: false,
      deviceType: 'desktop',
      deviceInfo: 'PC - 192.168.1.101',
      players: 0,
      maxPlayers: 15,
      cpu: '0%',
      ram: '0GB'
    },
    {
      id: 3,
      name: 'Mini Games Hub',
      iconColor: '#eab308',
      isRunning: true,
      deviceType: 'server',
      deviceInfo: 'Cloud Server - AWS',
      players: 45,
      maxPlayers: 50,
      cpu: '78%',
      ram: '7.8GB'
    },
    {
      id: 4,
      name: 'Modded Adventure',
      iconColor: '#a855f7',
      isRunning: false,
      deviceType: 'mobile',
      deviceInfo: 'Mobile - Android',
      players: 0,
      maxPlayers: 10,
      cpu: '0%',
      ram: '0GB'
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerDevice, setNewServerDevice] = useState('desktop');

  const toggleServer = (id) => {
    setServers(servers.map(server => 
      server.id === id ? { ...server, isRunning: !server.isRunning } : server
    ));
  };

  const deleteServer = (id) => {
    setServers(servers.filter(server => server.id !== id));
  };

  const addServer = () => {
    if (!newServerName.trim()) return;
    
    const colors = ['#10b981', '#3b82f6', '#eab308', '#a855f7', '#ef4444', '#8b5cf6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const deviceInfoMap = {
      desktop: 'PC - 192.168.1.' + (100 + servers.length),
      server: 'Cloud Server - AWS',
      mobile: 'Mobile - Android',
      other: 'Custom Device'
    };

    const newServer = {
      id: Math.max(...servers.map(s => s.id), 0) + 1,
      name: newServerName,
      iconColor: randomColor,
      isRunning: false,
      deviceType: newServerDevice,
      deviceInfo: deviceInfoMap[newServerDevice],
      players: 0,
      maxPlayers: 20,
      cpu: '0%',
      ram: '0GB'
    };

    setServers([...servers, newServer]);
    setNewServerName('');
    setNewServerDevice('desktop');
    setShowAddModal(false);
  };

  const getDeviceIcon = (type) => {
    switch(type) {
      case 'desktop': return <Monitor className="w-5 h-5" />;
      case 'mobile': return <Smartphone className="w-5 h-5" />;
      case 'server': return <Server className="w-5 h-5" />;
      default: return <HardDrive className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Server Management</h1>
              <p className="text-slate-400">Manage your Minecraft servers</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-emerald-500/50 hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Add Server
            </button>
          </div>
        </div>

        {/* Server List */}
        <div className="grid gap-4">
          {servers.map(server => (
            <div
              key={server.id}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-all duration-200 hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                {/* Left Section - Server Info */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Server Icon */}
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center text-5xl border border-slate-600">
                    <div style={{ color: 'white' }}>
                      <NetworkIcon />
                    </div>
                  </div>

                  {/* Server Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{server.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        server.isRunning 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-slate-600/20 text-slate-400 border border-slate-600/30'
                      }`}>
                        {server.isRunning ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    
                    {/* Device Info */}
                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                      <div className="flex items-center gap-2 bg-slate-700/30 px-3 py-1 rounded-md">
                        {getDeviceIcon(server.deviceType)}
                        <span className="text-sm">{server.deviceInfo}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Wifi className="w-4 h-4" />
                        <span>{server.players}/{server.maxPlayers} players</span>
                      </div>
                      {server.isRunning && (
                        <>
                          <div className="flex items-center gap-2 text-slate-300">
                            <Cpu className="w-4 h-4" />
                            <span>CPU: {server.cpu}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <HardDrive className="w-4 h-4" />
                            <span>RAM: {server.ram}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section - Toggle */}
                <div className="ml-6 flex items-center gap-3">
                  <button
                    onClick={() => deleteServer(server.id)}
                    className="p-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all duration-200 border border-red-600/30 hover:border-red-600"
                    title="Delete Server"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => toggleServer(server.id)}
                    className={`relative w-20 h-10 rounded-full transition-all duration-300 shadow-lg ${
                      server.isRunning 
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/50' 
                        : 'bg-slate-600 hover:bg-slate-500 shadow-slate-500/30'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full transition-transform duration-300 flex items-center justify-center ${
                      server.isRunning ? 'translate-x-10' : 'translate-x-0'
                    }`}>
                      <Power className={`w-4 h-4 ${server.isRunning ? 'text-emerald-600' : 'text-slate-600'}`} />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Server Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Add New Server</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Server Name</label>
                  <input 
                    type="text" 
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="My Minecraft Server"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Device Type</label>
                  <select 
                    value={newServerDevice}
                    onChange={(e) => setNewServerDevice(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="desktop">Desktop PC</option>
                    <option value="server">Cloud Server</option>
                    <option value="mobile">Mobile Device</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewServerName('');
                    setNewServerDevice('desktop');
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={addServer}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-emerald-500/50"
                >
                  Add Server
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinecraftServerPanel;