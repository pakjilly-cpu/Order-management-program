/**
 * UserManagement Component
 * 사용자 관리를 위한 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { useUsers } from '@/hooks/useUsers';
import type { User, UserRole } from '@/types/database';

// 확인 모달 컴포넌트
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// 토글 스위치 컴포넌트
interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled = false, title }) => {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      title={title}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

// 프로필 아바타 컴포넌트
interface ProfileAvatarProps {
  avatarUrl: string | null;
  name: string | null;
  email: string;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ avatarUrl, name, email }) => {
  const displayName = name || email.split('@')[0];
  const initial = displayName.charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className="w-10 h-10 rounded-full object-cover"
        onError={(e) => {
          // 이미지 로드 실패 시 이니셜로 대체
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
      {initial}
    </div>
  );
};

// 권한 뱃지 컴포넌트
interface RoleBadgeProps {
  role: UserRole;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isAdmin
          ? 'bg-purple-100 text-purple-800'
          : 'bg-slate-100 text-slate-600'
      }`}
    >
      {isAdmin ? '관리자' : '일반 사용자'}
    </span>
  );
};

// 메인 컴포넌트
export const UserManagement: React.FC = () => {
  const { users, isLoading, error, toggleActive, changeRole, checkAdminCount } = useUsers();
  const [adminCount, setAdminCount] = useState<number>(0);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'role' | 'active';
    user: User | null;
    newValue: UserRole | boolean | null;
  }>({
    isOpen: false,
    type: 'role',
    user: null,
    newValue: null
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 관리자 수 조회
  useEffect(() => {
    const fetchAdminCount = async () => {
      const { count } = await checkAdminCount();
      if (count !== null) {
        setAdminCount(count);
      }
    };
    fetchAdminCount();
  }, [checkAdminCount, users]);

  // 알림 표시
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 마지막 관리자인지 확인
  const isLastAdmin = (user: User): boolean => {
    return user.role === 'admin' && user.is_active && adminCount <= 1;
  };

  // 권한 변경 핸들러
  const handleRoleChange = (user: User, newRole: UserRole) => {
    if (newRole === user.role) return;

    // 마지막 관리자 보호
    if (user.role === 'admin' && newRole === 'user' && isLastAdmin(user)) {
      showNotification('error', '마지막 관리자는 권한을 변경할 수 없습니다.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'role',
      user,
      newValue: newRole
    });
  };

  // 활성화 토글 핸들러
  const handleToggleActive = (user: User) => {
    // 마지막 관리자 보호 (비활성화 시도 시)
    if (user.is_active && isLastAdmin(user)) {
      showNotification('error', '마지막 관리자는 비활성화할 수 없습니다.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'active',
      user,
      newValue: !user.is_active
    });
  };

  // 확인 모달 처리
  const handleConfirm = async () => {
    if (!confirmModal.user) return;

    setActionLoading(confirmModal.user.id);

    try {
      if (confirmModal.type === 'role' && typeof confirmModal.newValue === 'string') {
        const { success, error: roleError } = await changeRole(confirmModal.user.id, confirmModal.newValue as UserRole);
        if (success) {
          showNotification('success', '권한이 변경되었습니다.');
        } else if (roleError) {
          showNotification('error', roleError.message);
        }
      } else if (confirmModal.type === 'active') {
        const { success, error: toggleError } = await toggleActive(confirmModal.user.id);
        if (success) {
          showNotification('success', confirmModal.newValue ? '사용자가 활성화되었습니다.' : '사용자가 비활성화되었습니다.');
        } else if (toggleError) {
          showNotification('error', toggleError.message);
        }
      }
    } finally {
      setActionLoading(null);
      setConfirmModal({ isOpen: false, type: 'role', user: null, newValue: null });
    }
  };

  // 모달 취소
  const handleCancel = () => {
    setConfirmModal({ isOpen: false, type: 'role', user: null, newValue: null });
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto w-full p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-slate-500">사용자 목록을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="max-w-4xl mx-auto w-full p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">오류가 발생했습니다</h3>
            <p className="text-slate-500 text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // 빈 상태
  if (users.length === 0) {
    return (
      <div className="max-w-4xl mx-auto w-full p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">등록된 사용자가 없습니다</h3>
            <p className="text-slate-500 text-sm">아직 등록된 사용자가 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full p-6">
      {/* 알림 */}
      {notification && (
        <div
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl z-50 text-sm font-medium animate-fade-in-down whitespace-nowrap ${
            notification.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* 확인 모달 */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === 'role' ? '권한 변경' : '상태 변경'}
        message={
          confirmModal.type === 'role'
            ? `"${confirmModal.user?.name || confirmModal.user?.email}"님의 권한을 "${confirmModal.newValue === 'admin' ? '관리자' : '일반 사용자'}"로 변경하시겠습니까?`
            : `"${confirmModal.user?.name || confirmModal.user?.email}"님을 ${confirmModal.newValue ? '활성화' : '비활성화'}하시겠습니까?`
        }
        confirmText="확인"
        cancelText="취소"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isLoading={actionLoading !== null}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">사용자 관리</h2>
              <p className="text-sm text-slate-500 mt-1">
                총 {users.length}명의 사용자 (관리자 {adminCount}명)
              </p>
            </div>
          </div>
        </div>

        {/* 데스크톱 테이블 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  권한
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  활성 상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => {
                const lastAdmin = isLastAdmin(user);
                return (
                  <tr key={user.id} className={`${!user.is_active ? 'bg-slate-50' : ''} hover:bg-slate-50 transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <ProfileAvatar
                          avatarUrl={user.avatar_url}
                          name={user.name}
                          email={user.email}
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {user.name || '-'}
                          </div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 ${
                          user.is_active ? 'text-green-600' : 'text-slate-400'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                        {user.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-3">
                        {/* 권한 변경 드롭다운 */}
                        <div className="relative" title={lastAdmin ? '마지막 관리자는 권한을 변경할 수 없습니다' : ''}>
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                            disabled={lastAdmin || actionLoading === user.id}
                            className={`text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              lastAdmin ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white cursor-pointer'
                            }`}
                          >
                            <option value="admin">관리자</option>
                            <option value="user">일반 사용자</option>
                          </select>
                        </div>
                        {/* 활성화 토글 */}
                        <ToggleSwitch
                          checked={user.is_active}
                          onChange={() => handleToggleActive(user)}
                          disabled={lastAdmin || actionLoading === user.id}
                          title={lastAdmin ? '마지막 관리자는 비활성화할 수 없습니다' : user.is_active ? '비활성화' : '활성화'}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 리스트 */}
        <div className="md:hidden divide-y divide-slate-200">
          {users.map((user) => {
            const lastAdmin = isLastAdmin(user);
            return (
              <div key={user.id} className={`p-4 ${!user.is_active ? 'bg-slate-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <ProfileAvatar
                    avatarUrl={user.avatar_url}
                    name={user.name}
                    email={user.email}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {user.name || '-'}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{user.email}</div>
                      </div>
                      <ToggleSwitch
                        checked={user.is_active}
                        onChange={() => handleToggleActive(user)}
                        disabled={lastAdmin || actionLoading === user.id}
                        title={lastAdmin ? '마지막 관리자는 비활성화할 수 없습니다' : ''}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <RoleBadge role={user.role} />
                        <span className="text-xs text-slate-400">
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                      <div title={lastAdmin ? '마지막 관리자는 권한을 변경할 수 없습니다' : ''}>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                          disabled={lastAdmin || actionLoading === user.id}
                          className={`text-xs border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            lastAdmin ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white cursor-pointer'
                          }`}
                        >
                          <option value="admin">관리자</option>
                          <option value="user">일반 사용자</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
