import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Smartphone, X, Download, Code, Check, Sparkles, RefreshCw, Send, BookOpen, Clock } from 'lucide-react';

interface MobileAppSyncModalProps {
  onClose: () => void;
}

export const MobileAppSyncModal: React.FC<MobileAppSyncModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'simulator' | 'code'>('simulator');
  const [copied, setCopied] = useState(false);

  // Phone Simulator State
  const [simScreen, setSimScreen] = useState<'home' | 'classrooms'>('home');
  const [simClassrooms, setSimClassrooms] = useState<any[]>([]);
  const [simLoading, setSimLoading] = useState(false);

  const loadSimClassrooms = async () => {
    setSimLoading(true);
    try {
      const res = await api.getClassrooms();
      setSimClassrooms(res.classrooms || []);
    } catch (err) {
      console.error('Sim error:', err);
    } finally {
      setSimLoading(false);
    }
  };

  const sampleJavaCode = `package com.studyassistant.app;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Synchronize with shared backend REST endpoint
        ApiClient.setBaseUrl("https://ais-dev-p5zczddfsq2kobsnbgwws2-282399089860.asia-east1.run.app");
        ApiClient.get("/api/classrooms", new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(JSONObject response) {
                // Instantly update Android UI list view
            }
            @Override
            public void onError(String errorMessage) {
                // Show error toast
            }
        });
    }
}`;

  const copyJavaCode = () => {
    navigator.clipboard.writeText(sampleJavaCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111113] border border-[#242428] rounded-2xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#242428] mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#161618] border border-[#242428] flex items-center justify-center text-[#5B8CFF]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#F5F5F5]">Native Android App Sync & Simulator</h2>
              <p className="text-xs text-[#71717A]">Shared Backend REST API synchronization for Web & Mobile</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#161618] text-[#71717A] hover:text-[#F5F5F5] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex space-x-2 mb-6 bg-[#161618] p-1 rounded-xl border border-[#242428]">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'simulator'
                ? 'bg-[#111113] text-[#5B8CFF] border border-[#242428]'
                : 'text-[#71717A] hover:text-[#F5F5F5]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Interactive Android Smartphone Preview</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'code'
                ? 'bg-[#111113] text-[#5B8CFF] border border-[#242428]'
                : 'text-[#71717A] hover:text-[#F5F5F5]'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Java Source Code & ApiClient</span>
          </button>
        </div>

        {/* SIMULATOR TAB */}
        {activeTab === 'simulator' && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
            {/* Phone Frame */}
            <div className="w-[300px] h-[560px] bg-[#09090B] border-[6px] border-[#242428] rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col justify-between p-3 shrink-0">
              {/* Phone Notch */}
              <div className="w-24 h-3.5 bg-[#242428] rounded-b-xl mx-auto flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#111113]" />
              </div>

              {/* Phone Screen Container */}
              <div className="flex-1 bg-[#111113] rounded-2xl p-3 mt-2 overflow-y-auto space-y-3 text-xs text-[#A1A1AA] border border-[#242428]">
                {simScreen === 'home' && (
                  <div className="space-y-3">
                    <div className="bg-[#161618] p-3 rounded-xl border border-[#242428]">
                      <div className="text-[10px] text-[#5B8CFF] font-mono font-bold">StudyMate Android App</div>
                      <div className="font-semibold text-sm mt-0.5 text-[#F5F5F5]">Welcome, {user?.name || 'User'}!</div>
                      <div className="text-[10px] text-[#71717A] mt-1 font-mono">Live REST API connection active</div>
                    </div>

                    <button
                      onClick={() => {
                        setSimScreen('classrooms');
                        loadSimClassrooms();
                      }}
                      className="w-full p-3 rounded-xl bg-[#161618] hover:bg-[#1E1E22] border border-[#242428] font-semibold text-left transition flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-[#5B8CFF]" />
                        <span className="text-[#F5F5F5]">My Classrooms</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#5B8CFF]">Sync Data</span>
                    </button>
                  </div>
                )}

                {simScreen === 'classrooms' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[#71717A] border-b border-[#242428] pb-1">
                      <span className="font-semibold text-[#F5F5F5]">Live Classroom List</span>
                      <button onClick={() => setSimScreen('home')} className="text-[10px] text-[#5B8CFF] font-mono">
                        Back
                      </button>
                    </div>

                    {simLoading ? (
                      <div className="text-center text-[10px] text-[#71717A] py-4 font-mono">Fetching from Server...</div>
                    ) : simClassrooms.length === 0 ? (
                      <div className="text-center text-[10px] text-[#71717A] py-4">No classrooms synced</div>
                    ) : (
                      simClassrooms.map(c => (
                        <div key={c.id} className="p-2.5 rounded-xl bg-[#161618] border border-[#242428]">
                          <div className="font-semibold text-xs text-[#F5F5F5]">{c.name}</div>
                          <div className="text-[10px] text-[#5B8CFF] font-mono">Code: {c.code}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Phone Home Indicator Bar */}
              <div className="w-20 h-1 bg-[#383840] rounded-full mx-auto my-1" />
            </div>

            {/* Sync Explanation */}
            <div className="space-y-4 max-w-sm text-[#A1A1AA] text-xs leading-relaxed">
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Instant Web-to-Mobile Synchronization</h3>
              <p>
                Both the React Web App and the Native Java Android app communicate with the exact same Express REST API backend endpoints (`/api/*`).
              </p>
              <ul className="space-y-2 text-[#71717A] list-disc pl-4">
                <li>Assignments created by Teachers on Web instantly appear on Android.</li>
                <li>Assignment submissions turned in on Mobile are immediately available to Teachers on Web.</li>
                <li>AI Study Tools and Quiz Scores are stored in the unified database.</li>
              </ul>
            </div>
          </div>
        )}

        {/* CODE TAB */}
        {activeTab === 'code' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#71717A]">com/studyassistant/app/MainActivity.java</span>
              <button
                onClick={copyJavaCode}
                className="px-3 py-1.5 bg-[#161618] hover:bg-[#242428] text-[#F5F5F5] font-semibold rounded-xl text-xs transition border border-[#242428] flex items-center space-x-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#65D6B0]" /> : <Download className="w-3.5 h-3.5 text-[#5B8CFF]" />}
                <span>{copied ? 'Copied Java Code' : 'Copy Source Code'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-[#09090B] border border-[#242428] text-xs font-mono text-[#5B8CFF] overflow-x-auto leading-relaxed">
              {sampleJavaCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
