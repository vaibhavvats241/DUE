import React, { useState, useEffect } from 'react';
import { X, Flame, Shield, Check, Copy, AlertCircle, RefreshCw, Smartphone, KeyRound, Database, CheckCircle2 } from 'lucide-react';
import {
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  parseFirebaseConfigInput,
  testFirebaseConnection,
  FirebaseConfigOptions,
} from '../lib/firebase';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirebaseActive: boolean;
  onReloadFirebase: () => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  isFirebaseActive,
  onReloadFirebase,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'rules' | 'guide'>('status');
  const [configMode, setConfigMode] = useState<'paste' | 'fields'>('paste');
  const [copiedRules, setCopiedRules] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form field states
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  const [jsonInput, setJsonInput] = useState('');

  // Hydrate fields from stored config whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const saved = getSavedFirebaseConfig();
      if (saved) {
        setApiKey(saved.apiKey || '');
        setProjectId(saved.projectId || '');
        setAuthDomain(saved.authDomain || '');
        setStorageBucket(saved.storageBucket || '');
        setMessagingSenderId(saved.messagingSenderId || '');
        setAppId(saved.appId || '');
        setJsonInput(JSON.stringify(saved, null, 2));
      } else {
        setJsonInput('');
      }
      setErrorMsg('');
      setSaveSuccess(false);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentConfig = getSavedFirebaseConfig();

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testFirebaseConnection();
      setTestResult({
        success: result.success,
        message: result.message,
      });
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || 'Connection test failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setErrorMsg('');
    setSaveSuccess(false);
    setTestResult(null);

    let parsed: FirebaseConfigOptions;
    try {
      if (configMode === 'paste') {
        if (!jsonInput.trim()) {
          throw new Error('Please paste your Firebase configuration snippet or JSON.');
        }
        parsed = parseFirebaseConfigInput(jsonInput);
      } else {
        if (!apiKey.trim() || !projectId.trim()) {
          throw new Error('API Key and Project ID are required.');
        }
        parsed = {
          apiKey: apiKey.trim(),
          projectId: projectId.trim(),
          authDomain: authDomain.trim() || undefined,
          storageBucket: storageBucket.trim() || undefined,
          messagingSenderId: messagingSenderId.trim() || undefined,
          appId: appId.trim() || undefined,
        };
      }

      // Save to persistent storage (localStorage)
      saveFirebaseConfig(parsed);

      // Update inputs to match saved
      setApiKey(parsed.apiKey || '');
      setProjectId(parsed.projectId || '');
      setAuthDomain(parsed.authDomain || '');
      setStorageBucket(parsed.storageBucket || '');
      setMessagingSenderId(parsed.messagingSenderId || '');
      setAppId(parsed.appId || '');
      setJsonInput(JSON.stringify(parsed, null, 2));

      setSaveSuccess(true);
      setSaveSuccessMsg(`Configuration saved persistently for project "${parsed.projectId}".`);

      // Run connection test immediately to verify
      setIsTesting(true);
      const testRes = await testFirebaseConnection(parsed);
      setTestResult({
        success: testRes.success,
        message: testRes.message,
      });
      setIsTesting(false);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Invalid Firebase configuration');
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to disconnect Firebase and clear saved configuration? Your local data will not be deleted.')) {
      clearFirebaseConfig();
      setApiKey('');
      setProjectId('');
      setAuthDomain('');
      setStorageBucket('');
      setMessagingSenderId('');
      setAppId('');
      setJsonInput('');
      setTestResult(null);
      setErrorMsg('');
      setSaveSuccess(false);
      onReloadFirebase();
    }
  };

  const firestoreRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /groups/{groupId} {
      allow read, write: if request.auth != null;
      
      match /expenses/{expenseId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
        allow update: if request.auth != null;
        allow delete: if request.auth != null;
      }
      
      match /payments/{paymentId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(firestoreRulesText);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  return (
    <div id="firebase-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900 border border-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isFirebaseActive ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-600'}`}>
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Firebase Cloud Sync</h2>
              <p className="text-xs text-slate-500">Persistent cloud database & real-time synchronization</p>
            </div>
          </div>
          <button
            id="close-firebase-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 px-5 text-xs font-semibold text-slate-600 bg-white">
          <button
            id="tab-connection-status"
            onClick={() => setActiveTab('status')}
            className={`py-3 px-3 border-b-2 transition ${activeTab === 'status' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'}`}
          >
            Connection Status
          </button>
          <button
            id="tab-config-settings"
            onClick={() => setActiveTab('config')}
            className={`py-3 px-3 border-b-2 transition ${activeTab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'}`}
          >
            Config Settings
          </button>
          <button
            id="tab-android-guide"
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3 border-b-2 transition ${activeTab === 'guide' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'}`}
          >
            Android & Cloud Setup
          </button>
          <button
            id="tab-security-rules"
            onClick={() => setActiveTab('rules')}
            className={`py-3 px-3 border-b-2 transition ${activeTab === 'rules' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-slate-900'}`}
          >
            Security Rules
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          
          {/* TAB 1: STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${isFirebaseActive ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'}`}>
                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${isFirebaseActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {isFirebaseActive ? 'Firebase Cloud Connected' : 'Local Khata Mode (Ready to Sync)'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isFirebaseActive
                      ? `Real-time cloud database active for project "${currentConfig?.projectId}". Ledger data is persistently backed up and synchronizes across all devices.`
                      : 'Running in offline-first mode. All local dues, expenses, and groups are safely stored in browser storage. Enter your Firebase configuration in Config Settings to enable live sharing.'}
                  </p>
                </div>
              </div>

              {currentConfig && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Project ID:</span>
                    <span className="font-bold text-slate-800">{currentConfig.projectId}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Auth Domain:</span>
                    <span className="text-slate-800">{currentConfig.authDomain || 'Default'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>API Key:</span>
                    <span className="text-slate-800 font-mono">
                      {currentConfig.apiKey ? `${currentConfig.apiKey.substring(0, 8)}...` : 'Not set'}
                    </span>
                  </div>
                </div>
              )}

              {/* Test Connection Output */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">{testResult.success ? 'Connection Verified' : 'Connection Notice'}</div>
                    <div className="mt-0.5 leading-relaxed break-words">{testResult.message}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  id="test-firebase-connection-btn"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
                </button>
                {currentConfig && (
                  <button
                    id="disconnect-firebase-btn"
                    onClick={handleClear}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 transition cursor-pointer"
                  >
                    Disconnect Firebase
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your Firebase web configuration from <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Firebase Console</a>.
                </p>
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setConfigMode('paste')}
                    className={`px-2.5 py-1 rounded-md transition ${configMode === 'paste' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    Paste Snippet
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigMode('fields')}
                    className={`px-2.5 py-1 rounded-md transition ${configMode === 'fields' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    Input Fields
                  </button>
                </div>
              </div>

              {configMode === 'paste' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Firebase Config Snippet / JSON
                  </label>
                  <textarea
                    id="firebase-config-input"
                    rows={7}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder={`const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "friends-khata.firebaseapp.com",
  projectId: "friends-khata",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};`}
                    className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/70"
                  />
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        API Key <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="firebase-apikey-input"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Project ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="firebase-projectid-input"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        placeholder="my-khata-app"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Auth Domain</label>
                      <input
                        type="text"
                        id="firebase-authdomain-input"
                        value={authDomain}
                        onChange={(e) => setAuthDomain(e.target.value)}
                        placeholder="my-app.firebaseapp.com"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Storage Bucket</label>
                      <input
                        type="text"
                        id="firebase-storagebucket-input"
                        value={storageBucket}
                        onChange={(e) => setStorageBucket(e.target.value)}
                        placeholder="my-app.appspot.com"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Messaging Sender ID</label>
                      <input
                        type="text"
                        id="firebase-senderid-input"
                        value={messagingSenderId}
                        onChange={(e) => setMessagingSenderId(e.target.value)}
                        placeholder="123456789"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">App ID</label>
                      <input
                        type="text"
                        id="firebase-appid-input"
                        value={appId}
                        onChange={(e) => setAppId(e.target.value)}
                        placeholder="1:12345:web:abcd"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Firebase Configuration Saved!</div>
                    <div>{saveSuccessMsg}</div>
                  </div>
                </div>
              )}

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}

              <button
                id="save-firebase-config-btn"
                onClick={handleSave}
                disabled={isTesting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting & Verifying...</span>
                  </>
                ) : (
                  <span>Save & Connect Firebase</span>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: ANDROID & CLOUD GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5">
                <Smartphone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-blue-950 text-sm">How to Install on Android Phone</h5>
                  <ol className="mt-1.5 list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                    <li>Open this URL in <strong>Google Chrome</strong> on your Android device.</li>
                    <li>Tap the <strong>Install App</strong> banner at the top (or tap Chrome&apos;s <strong>&#8942;</strong> three dots menu).</li>
                    <li>Select <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install app&quot;</strong>.</li>
                    <li>DUE Khata will open in full-screen standalone mode like a native app.</li>
                  </ol>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h5 className="font-bold text-slate-900 text-sm">How to Connect Real Firebase in 2 Minutes</h5>
                <ol className="mt-1.5 list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed">
                  <li>Visit <span className="font-mono text-blue-600 font-semibold">console.firebase.google.com</span> and click <strong>Create Project</strong>.</li>
                  <li>Click <strong>Build &rarr; Firestore Database</strong> &rarr; Create database (Start in test mode or paste rules).</li>
                  <li>Click <strong>Build &rarr; Authentication</strong> &rarr; Enable <strong>Anonymous</strong> sign-in.</li>
                  <li>Go to <strong>Project Settings</strong> &rarr; Click the <strong>&lt;/&gt; (Web app)</strong> icon.</li>
                  <li>Copy the <span className="font-mono text-xs">firebaseConfig</span> code and paste it into the Config Settings tab.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Deploy these rules in <strong>Firestore Database &rarr; Rules</strong> to secure your Khata:
                </p>
                <button
                  id="copy-rules-btn"
                  onClick={copyRules}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  {copiedRules ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRules ? 'Copied!' : 'Copy Rules'}</span>
                </button>
              </div>

              <pre className="text-[11px] font-mono p-3 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto max-h-56 leading-tight select-text">
                {firestoreRulesText}
              </pre>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            id="done-firebase-modal-btn"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

