import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiHelpers } from '../services/api';
import { Loader2, Link as LinkIcon, Unlink, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function Settings() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check for Strava callback status
  useEffect(() => {
    const stravaStatus = searchParams.get('strava');
    if (stravaStatus) {
      if (stravaStatus === 'success') {
        toast.success('Strava connected successfully!');
        queryClient.invalidateQueries({ queryKey: ['strava-status'] });
      } else if (stravaStatus === 'already_connected') {
        toast.error('This Strava account is already connected to another user');
      } else if (stravaStatus === 'expired') {
        toast.error('Connection expired. Please try again.');
      } else if (stravaStatus === 'error') {
        toast.error('Failed to connect Strava. Please try again.');
      }
      // Clear the params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, queryClient]);

  // Fetch Strava connection status
  const { data: stravaStatus, isLoading: stravaLoading } = useQuery({
    queryKey: ['strava-status'],
    queryFn: () => apiHelpers.getStravaStatus().then((res) => res.data.data),
  });

  // Connect to Strava
  const connectStrava = useMutation({
    mutationFn: async () => {
      const response = await apiHelpers.getStravaAuthUrl();
      window.location.href = response.data.data.url;
    },
    onError: () => {
      toast.error('Failed to get Strava authorization URL');
    },
  });

  // Disconnect Strava
  const disconnectStrava = useMutation({
    mutationFn: () => apiHelpers.disconnectStrava(),
    onSuccess: () => {
      toast.success('Strava disconnected');
      queryClient.invalidateQueries({ queryKey: ['strava-status'] });
    },
    onError: () => {
      toast.error('Failed to disconnect Strava');
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your account and connected services
        </p>
      </div>

      {/* Profile Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Profile</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                defaultValue={user?.name || ''}
                className="input"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                defaultValue={user?.email}
                className="input"
                disabled
              />
            </div>
          </div>
          <div className="pt-2">
            <button className="btn-primary">Save Changes</button>
          </div>
        </div>
      </div>

      {/* Connected Services */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Connected Services</h2>
        </div>
        <div className="card-body">
          {/* Strava Connection */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FC4C02] rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" />
                  <path
                    d="M10.233 13.828L7.164 7.816 0 21.864h4.065l3.1-6.008 3.068 6.008h4.065l-4.065-8.036z"
                    opacity="0.6"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Strava</h3>
                {stravaLoading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : stravaStatus?.connected ? (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Connected</span>
                    {stravaStatus.lastSync && (
                      <span className="text-gray-400 ml-2">
                        Last sync: {new Date(stravaStatus.lastSync).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Not connected</p>
                )}
              </div>
            </div>

            {stravaStatus?.connected ? (
              <button
                onClick={() => disconnectStrava.mutate()}
                disabled={disconnectStrava.isPending}
                className="btn-outline text-red-600 border-red-200 hover:bg-red-50"
              >
                {disconnectStrava.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => connectStrava.mutate()}
                disabled={connectStrava.isPending}
                className="btn bg-[#FC4C02] text-white hover:bg-[#e04502]"
              >
                {connectStrava.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Connect
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Training Zones (placeholder) */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Training Zones</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">FTP (watts)</label>
              <input type="number" className="input" placeholder="250" />
            </div>
            <div>
              <label className="label">LTHR (bpm)</label>
              <input type="number" className="input" placeholder="170" />
            </div>
            <div>
              <label className="label">Threshold Pace (min/km)</label>
              <input type="text" className="input" placeholder="4:30" />
            </div>
            <div>
              <label className="label">CSS (min/100m)</label>
              <input type="text" className="input" placeholder="1:45" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            These values will be auto-calculated from your activities in Phase 3.
          </p>
        </div>
      </div>

      {/* Preferences */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Preferences</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Units</p>
              <p className="text-sm text-gray-500">Metric or Imperial</p>
            </div>
            <select className="input w-auto">
              <option value="METRIC">Metric (km, kg)</option>
              <option value="IMPERIAL">Imperial (mi, lbs)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Week Start</p>
              <p className="text-sm text-gray-500">First day of training week</p>
            </div>
            <select className="input w-auto">
              <option value="1">Monday</option>
              <option value="0">Sunday</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <div className="card-header">
          <h2 className="font-semibold text-red-600">Danger Zone</h2>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-gray-500">
                Permanently delete your account and all data
              </p>
            </div>
            <button className="btn-danger">Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
