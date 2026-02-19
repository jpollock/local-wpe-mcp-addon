import { describe, it, expect } from 'vitest';
import { getDefaultTier, getToolSafety, TIER_OVERRIDES } from '../../src/safety.js';

describe('safety classifier', () => {
  describe('getDefaultTier', () => {
    it('returns 1 for GET', () => {
      expect(getDefaultTier('GET')).toBe(1);
    });

    it('returns 2 for PATCH', () => {
      expect(getDefaultTier('PATCH')).toBe(2);
    });

    it('returns 2 for POST', () => {
      expect(getDefaultTier('POST')).toBe(2);
    });

    it('returns 3 for DELETE', () => {
      expect(getDefaultTier('DELETE')).toBe(3);
    });
  });

  describe('tier overrides', () => {
    it('wpe_copy_install is tier 3 despite being POST', () => {
      expect(TIER_OVERRIDES['wpe_copy_install']).toBe(3);
    });

    it('wpe_create_site is tier 3 despite being POST', () => {
      expect(TIER_OVERRIDES['wpe_create_site']).toBe(3);
    });

    it('wpe_create_install is tier 3 despite being POST', () => {
      expect(TIER_OVERRIDES['wpe_create_install']).toBe(3);
    });

    it('wpe_create_account_user is tier 3 despite being POST', () => {
      expect(TIER_OVERRIDES['wpe_create_account_user']).toBe(3);
    });
  });

  describe('getToolSafety', () => {
    it('returns tier with confirmation message for tier 3 DELETE tools', () => {
      const safety = getToolSafety('wpe_delete_site', 'DELETE');
      expect(safety.tier).toBe(3);
      expect(safety.confirmationMessage).toBeTruthy();
      expect(safety.preChecks).toBeDefined();
      expect(safety.preChecks!.length).toBeGreaterThan(0);
    });

    it('returns tier without confirmation for tier 1 tools', () => {
      const safety = getToolSafety('wpe_get_accounts', 'GET');
      expect(safety.tier).toBe(1);
      expect(safety.confirmationMessage).toBeUndefined();
    });

    it('applies override over default', () => {
      const safety = getToolSafety('wpe_copy_install', 'POST');
      expect(safety.tier).toBe(3);
    });

    it('returns tier 2 for POST tools without override', () => {
      const safety = getToolSafety('wpe_purge_cache', 'POST');
      expect(safety.tier).toBe(2);
      expect(safety.confirmationMessage).toBeUndefined();
    });

    it('returns tier 3 with confirmation for overridden POST tools', () => {
      const safety = getToolSafety('wpe_create_site', 'POST');
      expect(safety.tier).toBe(3);
      expect(safety.confirmationMessage).toBeTruthy();
    });
  });
});
