import React, { useState } from 'react';
import { Users, Plus, ChevronDown, Check, LogOut, Share2, Copy, Sun, Moon, Trash2 } from 'lucide-react';
import { AppUser, Group } from '../types/khata';

interface HeaderProps {
  currentUser: AppUser;
  onLogout: () => void;
  groups: Group[];
  activeGroup: Group | null;
  onSelectGroup: (group: Group) => void;
  onOpenCreateOrJoin: () => void;
  onOpenDeleteGroup?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  groups,
  activeGroup,
  onSelectGroup,
  onOpenCreateOrJoin,
  onOpenDeleteGroup,
  theme = 'light',
  onToggleTheme,
}) => {
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const cleanUserName = currentUser.name.replace(/\s*\(You\)/gi, '').trim().toLowerCase();
  const cleanCreatorName = (activeGroup?.createdByName || '').replace(/\s*\(You\)/gi, '').trim().toLowerCase();
  const isCreatorOfActiveGroup = Boolean(
    activeGroup &&
    (activeGroup.createdBy === currentUser.id || cleanCreatorName === cleanUserName)
  );

  const handleCopyInvite = () => {
    if (activeGroup?.inviteCode) {
      navigator.clipboard.writeText(activeGroup.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-lg text-white shadow-sm border border-blue-400/40">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">DUE</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  Khata
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5">Shared Friends Ledger</p>
            </div>
          </div>

          {/* Right Controls: Theme Toggle & User Profile */}
          <div className="flex items-center gap-2">
            
            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                id="header-theme-toggle-btn"
                onClick={onToggleTheme}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 transition"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-blue-300" />
                )}
              </button>
            )}

            {/* User Account Menu */}
            <div className="relative">
              <button
                id="user-persona-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 transition shadow-xs"
                title="Account Settings"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-xs font-bold flex items-center justify-center text-white">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold leading-none">{currentUser.name.replace(/\s*\(You\)/gi, '').trim()}</div>
                  <div className="text-[10px] text-slate-400 leading-none mt-0.5 truncate max-w-[80px]">
                    {currentUser.id}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl py-2 text-slate-900 dark:text-white z-40 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {currentUser.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{currentUser.name.replace(/\s*\(You\)/gi, '').trim()}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">ID: {currentUser.id}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    {onToggleTheme && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleTheme();
                        }}
                        className="w-full py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {theme === 'dark' ? (
                            <Sun className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Moon className="w-4 h-4 text-blue-500" />
                          )}
                          <span>Theme: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">Switch</span>
                      </button>
                    )}

                    <button
                      type="button"
                      id="header-logout-btn"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full py-2 px-3 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-bold transition flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out of this Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Group Selection Sub-bar */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <button
              id="group-dropdown-btn"
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              className="flex items-center gap-2 text-left w-full hover:bg-slate-800/60 p-1 rounded-lg transition"
            >
              <Users className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="truncate flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {activeGroup ? activeGroup.name : 'Select Group'}
                </p>
                {activeGroup && (
                  <p className="text-[10px] text-slate-400">
                    {activeGroup.members?.length || 0} members &bull; Code: {activeGroup.inviteCode}
                  </p>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showGroupDropdown && (
              <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl py-2 text-slate-900 dark:text-white z-40 border border-slate-100 dark:border-slate-800">
                <div className="px-3 py-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Your Friend Groups
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {groups.map((grp) => (
                    <button
                      key={grp.id}
                      onClick={() => {
                        onSelectGroup(grp);
                        setShowGroupDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      <div>
                        <p className={`font-semibold ${activeGroup?.id === grp.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {grp.name}
                        </p>
                        <p className="text-[10px] text-slate-400">Invite Code: {grp.inviteCode}</p>
                      </div>
                      {activeGroup?.id === grp.id && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                    </button>
                  ))}
                </div>

                <div className="pt-2 px-2 border-t border-slate-100 dark:border-slate-800 mt-1 space-y-1">
                  <button
                    onClick={() => {
                      setShowGroupDropdown(false);
                      onOpenCreateOrJoin();
                    }}
                    className="w-full py-1.5 text-center text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create or Join Group
                  </button>

                  {isCreatorOfActiveGroup && onOpenDeleteGroup && (
                    <button
                      onClick={() => {
                        setShowGroupDropdown(false);
                        onOpenDeleteGroup();
                      }}
                      className="w-full py-1.5 text-center text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Current Group (Creator)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Creator Delete Group Action button */}
            {isCreatorOfActiveGroup && onOpenDeleteGroup && (
              <button
                id="header-delete-group-btn"
                onClick={onOpenDeleteGroup}
                title="Delete this group (Creator only)"
                className="flex items-center gap-1 bg-rose-950/80 hover:bg-rose-900 active:scale-95 text-rose-300 text-[11px] font-medium px-2 py-1 rounded-lg border border-rose-800 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            {/* Quick Invite Code copy badge */}
            {activeGroup && (
              <button
                id="copy-invite-code-btn"
                onClick={handleCopyInvite}
                title="Copy invite code to share with friends"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg border border-slate-700 transition"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3 h-3 text-blue-400" />
                    <span>{activeGroup.inviteCode}</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
