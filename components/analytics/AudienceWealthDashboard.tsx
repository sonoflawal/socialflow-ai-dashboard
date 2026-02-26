import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, BarChart, Bar, PieChart, Pie } from 'recharts';

const MaterialIcon = ({ name, className }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

type WealthTier = 'all' | 'whale' | 'dolphin' | 'fish' | 'shrimp';
type HolderType = 'all' | 'diamond' | 'paper' | 'swing';

interface FollowerWealthData {
  id: string;
  username: string;
  walletAddress: string;
  totalValue: number;
  tokenHoldings: number;
  holdingDuration: number;
  tier: WealthTier;
  holderType: HolderType;
  engagement: number;
}

// Mock data for demonstration
const generateMockData = (): FollowerWealthData[] => {
  const tiers: WealthTier[] = ['whale', 'dolphin', 'fish', 'shrimp'];
  const holderTypes: HolderType[] = ['diamond', 'paper', 'swing'];
  
  return Array.from({ length: 150 }, (_, i) => ({
    id: `follower-${i}`,
    username: `user_${i}`,
    walletAddress: `G${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
    totalValue: Math.random() * 1000000,
    tokenHoldings: Math.random() * 50000,
    holdingDuration: Math.random() * 365,
    tier: tiers[Math.floor(Math.random() * tiers.length)],
    holderType: holderTypes[Math.floor(Math.random() * holderTypes.length)],
    engagement: Math.random() * 100,
  }));
};

const TIER_COLORS = {
  whale: '#8b5cf6',
  dolphin: '#3b82f6',
  fish: '#14b8a6',
  shrimp: '#fb923c',
};

const TIER_THRESHOLDS = {
  whale: 100000,
  dolphin: 50000,
  fish: 10000,
  shrimp: 0,
};

export const AudienceWealthDashboard: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<WealthTier>('all');
  const [selectedHolderType, setSelectedHolderType] = useState<HolderType>('all');
  const [mockData] = useState(generateMockData());

  const filteredData = mockData.filter(item => {
    const tierMatch = selectedTier === 'all' || item.tier === selectedTier;
    const holderMatch = selectedHolderType === 'all' || item.holderType === selectedHolderType;
    return tierMatch && holderMatch;
  });

  const tierDistribution = [
    { name: 'Whales', value: mockData.filter(d => d.tier === 'whale').length, color: TIER_COLORS.whale },
    { name: 'Dolphins', value: mockData.filter(d => d.tier === 'dolphin').length, color: TIER_COLORS.dolphin },
    { name: 'Fish', value: mockData.filter(d => d.tier === 'fish').length, color: TIER_COLORS.fish },
    { name: 'Shrimp', value: mockData.filter(d => d.tier === 'shrimp').length, color: TIER_COLORS.shrimp },
  ];

  const holderTypeDistribution = [
    { name: 'Diamond Hands', value: mockData.filter(d => d.holderType === 'diamond').length, days: '180+' },
    { name: 'Paper Hands', value: mockData.filter(d => d.holderType === 'paper').length, days: '<30' },
    { name: 'Swing Traders', value: mockData.filter(d => d.holderType === 'swing').length, days: '30-180' },
  ];

  const topWhales = mockData
    .filter(d => d.tier === 'whale')
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  const handleExport = () => {
    const csvContent = [
      ['Username', 'Wallet', 'Total Value', 'Token Holdings', 'Tier', 'Holder Type', 'Engagement'],
      ...filteredData.map(d => [
        d.username,
        d.walletAddress,
        d.totalValue.toFixed(2),
        d.tokenHoldings.toFixed(2),
        d.tier,
        d.holderType,
        d.engagement.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audience-wealth-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-7 space-y-7 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Audience Wealth Analytics</h2>
          <p className="text-gray-subtext text-sm mt-1">Analyze follower wallet holdings and token distribution</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 bg-primary-blue text-white px-5 py-2.5 rounded-2xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
        >
          <MaterialIcon name="download" className="text-base" />
          Export Data
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-subtext mb-2">Wealth Tier</label>
            <select 
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as WealthTier)}
              className="w-full bg-dark-surface border border-gray-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-blue"
            >
              <option value="all">All Tiers</option>
              <option value="whale">🐋 Whales (&gt;$100K)</option>
              <option value="dolphin">🐬 Dolphins ($50K-$100K)</option>
              <option value="fish">🐟 Fish ($10K-$50K)</option>
              <option value="shrimp">🦐 Shrimp (&lt;$10K)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-subtext mb-2">Holder Type</label>
            <select 
              value={selectedHolderType}
              onChange={(e) => setSelectedHolderType(e.target.value as HolderType)}
              className="w-full bg-dark-surface border border-gray-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-blue"
            >
              <option value="all">All Types</option>
              <option value="diamond">💎 Diamond Hands (180+ days)</option>
              <option value="swing">🔄 Swing Traders (30-180 days)</option>
              <option value="paper">📄 Paper Hands (&lt;30 days)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => { setSelectedTier('all'); setSelectedHolderType('all'); }}
              className="px-4 py-2.5 bg-dark-surface border border-gray-border rounded-xl text-white hover:bg-gray-800 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-subtext text-sm">Total Audience Value</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${(mockData.reduce((sum, d) => sum + d.totalValue, 0) / 1000000).toFixed(2)}M
              </p>
            </div>
            <MaterialIcon name="account_balance_wallet" className="text-4xl text-purple-400" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-subtext text-sm">Whale Followers</p>
              <p className="text-2xl font-bold text-white mt-1">{mockData.filter(d => d.tier === 'whale').length}</p>
            </div>
            <MaterialIcon name="trending_up" className="text-4xl text-blue-400" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-teal-500/10 to-teal-500/5 border-teal-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-subtext text-sm">Diamond Hands</p>
              <p className="text-2xl font-bold text-white mt-1">{mockData.filter(d => d.holderType === 'diamond').length}</p>
            </div>
            <MaterialIcon name="diamond" className="text-4xl text-teal-400" />
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-subtext text-sm">Avg. Holding</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${(mockData.reduce((sum, d) => sum + d.tokenHoldings, 0) / mockData.length / 1000).toFixed(1)}K
              </p>
            </div>
            <MaterialIcon name="savings" className="text-4xl text-orange-400" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Wealth Distribution Heatmap */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-6">Token Distribution Heatmap</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  type="number" 
                  dataKey="tokenHoldings" 
                  name="Token Holdings" 
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#8892b0'}}
                  label={{ value: 'Token Holdings', position: 'insideBottom', offset: -5, fill: '#8892b0' }}
                />
                <YAxis 
                  type="number" 
                  dataKey="engagement" 
                  name="Engagement" 
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#8892b0'}}
                  label={{ value: 'Engagement Score', angle: -90, position: 'insideLeft', fill: '#8892b0' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#161b22', borderColor: '#334155', borderRadius: '12px' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'Token Holdings') return [`$${(value as number).toFixed(0)}`, name];
                    if (name === 'Engagement') return [`${(value as number).toFixed(1)}%`, name];
                    return [value, name];
                  }}
                />
                <Scatter name="Followers" data={filteredData} fill="#8884d8">
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TIER_COLORS[entry.tier]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Tier Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-6">Wealth Tier Distribution</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierDistribution}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {tierDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#334155', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {tierDistribution.map((entry) => (
              <div key={entry.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: entry.color}}></div>
                  <span className="text-white">{entry.name}</span>
                </div>
                <span className="font-medium text-white">{entry.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Holder Type Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-6">Holder Type Analysis</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={holderTypeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#8892b0', fontSize: 12}}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#8892b0'}}
                />
                <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#334155', borderRadius: '12px' }} />
                <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {holderTypeDistribution.map((entry) => (
              <div key={entry.name} className="flex justify-between items-center text-sm">
                <span className="text-white">{entry.name}</span>
                <span className="text-gray-subtext">{entry.days} days avg</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Whales Table */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-6">Top Whale Followers</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-subtext">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-subtext">Username</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-subtext">Wallet Address</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-subtext">Total Value</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-subtext">Token Holdings</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-subtext">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-subtext">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {topWhales.map((whale, index) => (
                <tr key={whale.id} className="border-b border-gray-border/50 hover:bg-dark-surface/50 transition-colors">
                  <td className="py-4 px-4">
                    <span className="text-white font-medium">#{index + 1}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-white">{whale.username}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-subtext font-mono text-xs">{whale.walletAddress.slice(0, 8)}...{whale.walletAddress.slice(-4)}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-white font-medium">${(whale.totalValue / 1000).toFixed(1)}K</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-white">${(whale.tokenHoldings / 1000).toFixed(1)}K</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      whale.holderType === 'diamond' ? 'bg-teal-500/20 text-teal-400' :
                      whale.holderType === 'swing' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {whale.holderType === 'diamond' ? '💎 Diamond' : 
                       whale.holderType === 'swing' ? '🔄 Swing' : '📄 Paper'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-dark-surface rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-teal rounded-full" 
                          style={{ width: `${whale.engagement}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-sm">{whale.engagement.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
