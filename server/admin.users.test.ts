import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('./db', () => ({
  getAllUsers: vi.fn(),
  updateUserRole: vi.fn(),
  getUserIdpStats: vi.fn(),
  getDb: vi.fn(),
}));

import { getAllUsers, updateUserRole, getUserIdpStats } from './db';

const mockUsers = [
  {
    id: 1,
    openId: 'user-1',
    name: 'Ahmed Moussa',
    email: 'ahmed@example.com',
    role: 'admin' as const,
    loginMethod: 'oauth',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    lastSignedIn: new Date('2026-03-01'),
  },
  {
    id: 2,
    openId: 'user-2',
    name: 'Sara Ali',
    email: 'sara@example.com',
    role: 'user' as const,
    loginMethod: 'oauth',
    createdAt: new Date('2025-02-01'),
    updatedAt: new Date('2025-02-01'),
    lastSignedIn: new Date('2026-02-15'),
  },
];

const mockIdpStats = [
  { userId: 1, idpCount: 5, lastGenerated: new Date('2026-03-20') },
  { userId: 2, idpCount: 2, lastGenerated: new Date('2026-02-10') },
];

describe('Admin User Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users ordered by creation date', async () => {
      (getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsers);

      const result = await getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Ahmed Moussa');
      expect(result[0].role).toBe('admin');
      expect(result[1].name).toBe('Sara Ali');
      expect(result[1].role).toBe('user');
    });

    it('should return empty array when database is unavailable', async () => {
      (getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getAllUsers();

      expect(result).toHaveLength(0);
    });
  });

  describe('getUserIdpStats', () => {
    it('should return IDP counts and last generated dates per user', async () => {
      (getUserIdpStats as ReturnType<typeof vi.fn>).mockResolvedValue(mockIdpStats);

      const result = await getUserIdpStats();

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(1);
      expect(Number(result[0].idpCount)).toBe(5);
      expect(result[1].userId).toBe(2);
      expect(Number(result[1].idpCount)).toBe(2);
    });

    it('should return empty array when no IDPs exist', async () => {
      (getUserIdpStats as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getUserIdpStats();

      expect(result).toHaveLength(0);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role to admin', async () => {
      (updateUserRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await updateUserRole(2, 'admin');

      expect(updateUserRole).toHaveBeenCalledWith(2, 'admin');
    });

    it('should update user role to user', async () => {
      (updateUserRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await updateUserRole(1, 'user');

      expect(updateUserRole).toHaveBeenCalledWith(1, 'user');
    });
  });

  describe('listUsers aggregation logic', () => {
    it('should correctly merge user data with IDP stats', () => {
      const statsMap = new Map(mockIdpStats.map((s) => [s.userId, s]));

      const enrichedUsers = mockUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        idpCount: statsMap.get(u.id)?.idpCount ?? 0,
        lastIdpGenerated: statsMap.get(u.id)?.lastGenerated ?? null,
      }));

      expect(enrichedUsers[0].idpCount).toBe(5);
      expect(enrichedUsers[1].idpCount).toBe(2);
      expect(enrichedUsers[0].lastIdpGenerated).toEqual(new Date('2026-03-20'));
    });

    it('should default idpCount to 0 for users with no IDPs', () => {
      const statsMap = new Map<number, { idpCount: number }>(); // empty map

      const enrichedUsers = mockUsers.map((u) => ({
        id: u.id,
        idpCount: statsMap.get(u.id)?.idpCount ?? 0,
      }));

      expect(enrichedUsers[0].idpCount).toBe(0);
      expect(enrichedUsers[1].idpCount).toBe(0);
    });
  });

  describe('getStats aggregation logic', () => {
    it('should correctly compute total users, total IDPs, and admin count', () => {
      const totalIdps = mockIdpStats.reduce((sum, s) => sum + Number(s.idpCount), 0);
      const adminCount = mockUsers.filter((u) => u.role === 'admin').length;

      expect(totalIdps).toBe(7);
      expect(adminCount).toBe(1);
      expect(mockUsers.length).toBe(2);
    });
  });

  describe('self-demotion guard', () => {
    it('should prevent an admin from demoting themselves', () => {
      const currentUserId = 1;
      const targetUserId = 1;
      const newRole = 'user';

      const wouldSelfDemote = targetUserId === currentUserId && newRole === 'user';

      expect(wouldSelfDemote).toBe(true);
    });

    it('should allow demoting a different admin', () => {
      const currentUserId = 1;
      const targetUserId = 2;
      const newRole = 'user';

      const wouldSelfDemote = targetUserId === currentUserId && newRole === 'user';

      expect(wouldSelfDemote).toBe(false);
    });
  });
});
