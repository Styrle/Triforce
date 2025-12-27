import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { api, apiHelpers } from '../services/api';
import { Loader2, Link as LinkIcon, Unlink, CheckCircle, AlertCircle, Save, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface AthleteProfile {
  id: string;
  dateOfBirth: string | null;
  sex: 'MALE' | 'FEMALE' | null;
  height: number | null;
  weight: number | null;
  ftp: number | null;
  lthr: number | null;
  thresholdPace: number | null;
  css: number | null;
  maxHr: number | null;
  restingHr: number | null;
}

export function Settings() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Form state for athlete profile
  const [profileForm, setProfileForm] = useState({
    sex: '' as 'MALE' | 'FEMALE' | '',
    weight: '',
    height: '',
    dateOfBirth: '',
    ftp: '',
    lthr: '',
    thresholdPace: '',
    css: '',
    maxHr: '',
    restingHr: '',
  });

  // Fetch athlete profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['athlete-profile'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: AthleteProfile }>('/profile');
      return response.data.data;
    },
  });

  // Update form when profile is loaded
  useEffect(() => {
    if (profile) {
      setProfileForm({
        sex: profile.sex || '',
        weight: profile.weight?.toString() || '',
        height: profile.height?.toString() || '',
        dateOfBirth: profile.dateOfBirth?.split('T')[0] || '',
        ftp: profile.ftp?.toString() || '',
        lthr: profile.lthr?.toString() || '',
        thresholdPace: profile.thresholdPace?.toString() || '',
        css: profile.css?.toString() || '',
        maxHr: profile.maxHr?.toString() || '',
        restingHr: profile.restingHr?.toString() || '',
      });
    }
  }, [profile]);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: Partial<AthleteProfile>) => {
      const response = await api.put('/profile', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['athlete-profile'] });
      queryClient.invalidateQueries({ queryKey: ['strength-standards'] });
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const handleProfileSave = () => {
    const data: Partial<AthleteProfile> = {};
    if (profileForm.sex) data.sex = profileForm.sex as 'MALE' | 'FEMALE';
    if (profileForm.weight) data.weight = parseFloat(profileForm.weight);
    if (profileForm.height) data.height = parseFloat(profileForm.height);
    if (profileForm.dateOfBirth) data.dateOfBirth = profileForm.dateOfBirth;
    if (profileForm.ftp) data.ftp = parseInt(profileForm.ftp);
    if (profileForm.lthr) data.lthr = parseInt(profileForm.lthr);
    if (profileForm.thresholdPace) data.thresholdPace = parseFloat(profileForm.thresholdPace);
    if (profileForm.css) data.css = parseFloat(profileForm.css);
    if (profileForm.maxHr) data.maxHr = parseInt(profileForm.maxHr);
    if (profileForm.restingHr) data.restingHr = parseInt(profileForm.restingHr);

    updateProfile.mutate(data);
  };

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
        </div>
      </div>

      {/* Physical Profile - Important for Strength Standards */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <User className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold">Physical Profile</h2>
        </div>
        <div className="card-body space-y-4">
          {profileLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Your bodyweight and sex are used to calculate personalized strength standards and Wilks/DOTS scores.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Sex</label>
                  <select
                    value={profileForm.sex}
                    onChange={(e) => setProfileForm({ ...profileForm, sex: e.target.value as 'MALE' | 'FEMALE' | '' })}
                    className="input"
                  >
                    <option value="">Select...</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div>
                  <label className="label">Bodyweight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profileForm.weight}
                    onChange={(e) => setProfileForm({ ...profileForm, weight: e.target.value })}
                    className="input"
                    placeholder="75"
                  />
                </div>
                <div>
                  <label className="label">Height (cm)</label>
                  <input
                    type="number"
                    value={profileForm.height}
                    onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })}
                    className="input"
                    placeholder="175"
                  />
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleProfileSave}
                  disabled={updateProfile.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Physical Profile
                </button>
              </div>
            </>
          )}
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

      {/* Training Zones */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Training Zones</h2>
        </div>
        <div className="card-body">
          {profileLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">FTP (watts)</label>
                  <input
                    type="number"
                    value={profileForm.ftp}
                    onChange={(e) => setProfileForm({ ...profileForm, ftp: e.target.value })}
                    className="input"
                    placeholder="250"
                  />
                </div>
                <div>
                  <label className="label">LTHR (bpm)</label>
                  <input
                    type="number"
                    value={profileForm.lthr}
                    onChange={(e) => setProfileForm({ ...profileForm, lthr: e.target.value })}
                    className="input"
                    placeholder="170"
                  />
                </div>
                <div>
                  <label className="label">Threshold Pace (m/s)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={profileForm.thresholdPace}
                    onChange={(e) => setProfileForm({ ...profileForm, thresholdPace: e.target.value })}
                    className="input"
                    placeholder="3.5"
                  />
                </div>
                <div>
                  <label className="label">CSS (m/s)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={profileForm.css}
                    onChange={(e) => setProfileForm({ ...profileForm, css: e.target.value })}
                    className="input"
                    placeholder="1.3"
                  />
                </div>
                <div>
                  <label className="label">Max HR (bpm)</label>
                  <input
                    type="number"
                    value={profileForm.maxHr}
                    onChange={(e) => setProfileForm({ ...profileForm, maxHr: e.target.value })}
                    className="input"
                    placeholder="190"
                  />
                </div>
                <div>
                  <label className="label">Resting HR (bpm)</label>
                  <input
                    type="number"
                    value={profileForm.restingHr}
                    onChange={(e) => setProfileForm({ ...profileForm, restingHr: e.target.value })}
                    className="input"
                    placeholder="55"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={handleProfileSave}
                  disabled={updateProfile.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Training Zones
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                These values are used to calculate your training zones and TSS metrics.
              </p>
            </>
          )}
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
