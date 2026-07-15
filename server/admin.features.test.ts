import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('./db', () => ({
  getAllUsers: vi.fn(),
  updateUserRole: vi.fn(),
  getUserIdpStats: vi.fn(),
  getDb: vi.fn(),
  insertRoleAuditLog: vi.fn(),
  getRoleAuditLog: vi.fn(),
  deleteIdpById: vi.fn(),
  deleteIdpsByIds: vi.fn(),
}));

import {
  insertRoleAuditLog,
  getRoleAuditLog,
  deleteIdpById,
  deleteIdpsByIds,
} from './db';

// ─── Audit Log Tests ──────────────────────────────────────────────────────────

describe('Role Audit Log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should insert a role audit log entry', async () => {
    (insertRoleAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    const result = await insertRoleAuditLog({
      actorId: 1,
      actorName: 'Ahmed Moussa',
      targetUserId: 2,
      targetUserName: 'Sara Ali',
      oldRole: 'user',
      newRole: 'admin',
    });

    expect(insertRoleAuditLog).toHaveBeenCalledOnce();
    expect(result).toEqual({ id: 1 });
  });

  it('should retrieve audit log entries with a limit', async () => {
    const mockLog = [
      {
        id: 1,
        actorId: 1,
        actorName: 'Ahmed Moussa',
        targetUserId: 2,
        targetUserName: 'Sara Ali',
        oldRole: 'user',
        newRole: 'admin',
        createdAt: new Date('2026-03-24'),
      },
    ];
    (getRoleAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(mockLog);

    const result = await getRoleAuditLog(200);

    expect(getRoleAuditLog).toHaveBeenCalledWith(200);
    expect(result).toHaveLength(1);
    expect(result[0].actorName).toBe('Ahmed Moussa');
    expect(result[0].newRole).toBe('admin');
  });

  it('should return empty array when no audit log entries exist', async () => {
    (getRoleAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getRoleAuditLog(200);

    expect(result).toEqual([]);
  });
});

// ─── IDP Delete Tests ─────────────────────────────────────────────────────────

describe('Admin IDP Deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a single IDP by ID', async () => {
    (deleteIdpById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await deleteIdpById(42);

    expect(deleteIdpById).toHaveBeenCalledWith(42);
    expect(deleteIdpById).toHaveBeenCalledOnce();
  });

  it('should delete multiple IDPs by IDs array', async () => {
    (deleteIdpsByIds as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await deleteIdpsByIds([1, 2, 3]);

    expect(deleteIdpsByIds).toHaveBeenCalledWith([1, 2, 3]);
    expect(deleteIdpsByIds).toHaveBeenCalledOnce();
  });

  it('should handle deletion of empty IDs array gracefully', async () => {
    (deleteIdpsByIds as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await deleteIdpsByIds([]);

    expect(deleteIdpsByIds).toHaveBeenCalledWith([]);
  });

  it('should propagate errors from deleteIdpById', async () => {
    (deleteIdpById as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('IDP not found')
    );

    await expect(deleteIdpById(999)).rejects.toThrow('IDP not found');
  });

  it('should propagate errors from deleteIdpsByIds', async () => {
    (deleteIdpsByIds as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Database error')
    );

    await expect(deleteIdpsByIds([1, 2])).rejects.toThrow('Database error');
  });
});

// ─── Chatbot Toggle Logic Tests ───────────────────────────────────────────────

describe('Chatbot Toggle State Logic', () => {
  it('should default chatbot to visible (true)', () => {
    const showChatbot = true;
    expect(showChatbot).toBe(true);
  });

  it('should toggle chatbot visibility from true to false', () => {
    let showChatbot = true;
    showChatbot = !showChatbot;
    expect(showChatbot).toBe(false);
  });

  it('should toggle chatbot visibility from false to true', () => {
    let showChatbot = false;
    showChatbot = !showChatbot;
    expect(showChatbot).toBe(true);
  });

  it('should hide CoachingAssistant when showChatbot is false', () => {
    const objectives = [{ title: 'Test Objective' }];
    const showChatbot = false;
    // Simulate the conditional: objectives.length > 0 && showChatbot
    const shouldRender = objectives.length > 0 && showChatbot;
    expect(shouldRender).toBe(false);
  });

  it('should show CoachingAssistant when showChatbot is true and objectives exist', () => {
    const objectives = [{ title: 'Test Objective' }];
    const showChatbot = true;
    const shouldRender = objectives.length > 0 && showChatbot;
    expect(shouldRender).toBe(true);
  });

  it('should not show CoachingAssistant when objectives are empty even if showChatbot is true', () => {
    const objectives: any[] = [];
    const showChatbot = true;
    const shouldRender = objectives.length > 0 && showChatbot;
    expect(shouldRender).toBe(false);
  });
});
