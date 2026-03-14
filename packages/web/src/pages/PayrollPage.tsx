import React, { useState, useEffect } from 'react';
import { payrollService } from '../services/api/payroll';
import { useAuth } from '../hooks/useAuth';
import { 
  Calculator, 
  Download, 
  Play, 
  CheckCircle, 
  Clock, 
  DollarSign,
  AlertCircle
} from 'lucide-react';

const PayrollPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'stubs' | 'runs' | 'simulate' | 'export'>('stubs');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form states
  const [runDate, setRunDate] = useState({ start: '', end: '' });
  const [simulateData, setSimulateData] = useState({ empId: '', start: '', end: '' });
  const [simResult, setSimResult] = useState<any>(null);
  const [exportRunId, setExportRunId] = useState('');

  const canManagePayroll = hasPermission('process_payroll');

  useEffect(() => {
    if (activeTab === 'stubs') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await payrollService.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    try {
      setLoading(true);
      const res = await payrollService.simulate(
        simulateData.empId, 
        new Date(simulateData.start), 
        new Date(simulateData.end)
      );
      setSimResult(res);
      setMessage('Simulation successful');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRun = async () => {
    try {
      setLoading(true);
      await payrollService.createRun(new Date(runDate.start), new Date(runDate.end));
      setMessage('Draft Payroll Run created successfully!');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to create run');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!exportRunId) return;
    window.location.href = payrollService.exportBankFileUrl(exportRunId);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payroll Center</h1>
          <p className="text-gray-500 mt-1">Enterprise salary processing, structures, and compliance.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('stubs')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stubs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          My Pay Stubs
        </button>
        {canManagePayroll && (
          <>
            <button 
              onClick={() => setActiveTab('runs')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'runs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Process Runs
            </button>
            <button 
              onClick={() => setActiveTab('simulate')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'simulate' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Simulate Payroll
            </button>
            <button 
              onClick={() => setActiveTab('export')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'export' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Bank Export
            </button>
          </>
        )}
      </div>

      {message && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>{message}</span>
        </div>
      )}

      {/* Tab Contents */}
      <div className="mt-6">
        {activeTab === 'stubs' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      No payroll history found.
                    </td>
                  </tr>
                ) : (
                  history.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${entry.grossPay}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">-${entry.deductions?.total || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">${entry.netPay}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'runs' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                <Play className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create Draft Payroll Run</h3>
                <p className="text-sm text-gray-500">Calculate salary across your entire organization.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                <input 
                  type="date" 
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={runDate.start}
                  onChange={e => setRunDate({...runDate, start: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                <input 
                  type="date" 
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={runDate.end}
                  onChange={e => setRunDate({...runDate, end: e.target.value})}
                />
              </div>
            </div>
            <button 
              onClick={handleCreateRun}
              disabled={loading || !runDate.start || !runDate.end}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-md"
            >
              {loading ? 'Processing...' : 'Generate Enterprise Payroll Run'}
            </button>
          </div>
        )}

        {activeTab === 'simulate' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Simulate Salary</h3>
                  <p className="text-sm text-gray-500">Preview 8-step engine formulas.</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input 
                    type="text" 
                    placeholder="UUID..."
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                    value={simulateData.empId}
                    onChange={e => setSimulateData({...simulateData, empId: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={simulateData.start}
                      onChange={e => setSimulateData({...simulateData, start: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input 
                      type="date" 
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      value={simulateData.end}
                      onChange={e => setSimulateData({...simulateData, end: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <button 
                onClick={handleSimulate}
                disabled={loading || !simulateData.empId}
                className="w-full px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-all shadow-md"
              >
                {loading ? 'Simulating...' : 'Run Simulation'}
              </button>
            </div>

            {simResult && (
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 text-white animate-in zoom-in-95 duration-300">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                  Simulation Results
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                    <span className="text-gray-400">Gross Pay</span>
                    <span className="text-xl font-medium">${simResult.grossPay}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-700 text-red-300">
                    <span>Total Deductions</span>
                    <span>-${simResult.deductions?.total}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-700 text-indigo-300">
                    <span>Reimbursements</span>
                    <span>+${simResult.reimbursements}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-700 text-red-300">
                    <span>Tax (TDS)</span>
                    <span>-${simResult.tax}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-medium text-gray-300">Final Net Pay</span>
                    <span className="text-3xl font-bold tracking-tight text-green-400">
                      ${simResult.netPay}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-blue-50 rounded-full text-blue-600">
                <Download className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Export Bank Transfer List</h3>
                <p className="text-gray-500 mt-2">Generate a ready-to-upload CSV for banking portals.</p>
              </div>
              
              <div className="w-full mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Payroll Run ID</label>
                <input 
                  type="text" 
                  placeholder="Enter Payroll Run UUID..."
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 mb-4"
                  value={exportRunId}
                  onChange={e => setExportRunId(e.target.value)}
                />
                <button 
                  onClick={handleDownloadCSV}
                  disabled={!exportRunId}
                  className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollPage;
