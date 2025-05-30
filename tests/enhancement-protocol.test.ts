// Enhancement Protocol Contract Tests
// Testing protocol creation, updates, and version management

import { describe, it, expect, beforeEach } from 'vitest';

// Mock Clarity contract environment for Enhancement Protocol
class MockEnhancementProtocolContract {
  constructor() {
    this.maps = new Map();
    this.variables = new Map();
    this.currentSender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    this.blockHeight = 1000;
    
    // Initialize variables
    this.variables.set('next-protocol-id', 1);
    
    // Protocol type constants
    this.PROTOCOL_MEMORY = 1;
    this.PROTOCOL_ATTENTION = 2;
    this.PROTOCOL_PROCESSING = 3;
    this.PROTOCOL_LEARNING = 4;
    this.PROTOCOL_CREATIVITY = 5;
  }
  
  setTxSender(sender) {
    this.currentSender = sender;
  }
  
  setBlockHeight(height) {
    this.blockHeight = height;
  }
  
  mapSet(mapName, key, value) {
    if (!this.maps.has(mapName)) {
      this.maps.set(mapName, new Map());
    }
    this.maps.get(mapName).set(JSON.stringify(key), value);
  }
  
  mapGet(mapName, key) {
    if (!this.maps.has(mapName)) {
      return null;
    }
    return this.maps.get(mapName).get(JSON.stringify(key)) || null;
  }
  
  varGet(varName) {
    return this.variables.get(varName);
  }
  
  varSet(varName, value) {
    this.variables.set(varName, value);
  }
  
  // Enhancement Protocol Contract Functions
  createProtocol(name, description, protocolType, methodology, durationWeeks, institutionId) {
    const protocolId = this.varGet('next-protocol-id');
    
    // Validate inputs
    if (!name || name.length > 100) {
      return { error: 'Invalid name' };
    }
    if (!description || description.length > 500) {
      return { error: 'Invalid description' };
    }
    if (protocolType > this.PROTOCOL_CREATIVITY) {
      return { error: 'Invalid protocol type' };
    }
    if (!methodology || methodology.length > 1000) {
      return { error: 'Invalid methodology' };
    }
    if (durationWeeks === 0) {
      return { error: 'Invalid duration' };
    }
    
    const protocol = {
      name: name,
      description: description,
      protocolType: protocolType,
      methodology: methodology,
      durationWeeks: durationWeeks,
      institutionId: institutionId,
      createdBy: this.currentSender,
      createdAt: this.blockHeight,
      isActive: true
    };
    
    this.mapSet('protocols', { 'protocol-id': protocolId }, protocol);
    this.varSet('next-protocol-id', protocolId + 1);
    
    return { ok: protocolId };
  }
  
  updateProtocol(protocolId, newMethodology, changes) {
    const protocol = this.mapGet('protocols', { 'protocol-id': protocolId });
    if (!protocol) {
      return { error: 'Protocol not found' };
    }
    
    // Check authorization
    if (protocol.createdBy !== this.currentSender) {
      return { error: 'Unauthorized' };
    }
    
    if (!newMethodology || newMethodology.length > 1000) {
      return { error: 'Invalid methodology' };
    }
    
    if (!changes || changes.length > 500) {
      return { error: 'Invalid changes description' };
    }
    
    // Update main protocol
    const updatedProtocol = {
      ...protocol,
      methodology: newMethodology
    };
    
    this.mapSet('protocols', { 'protocol-id': protocolId }, updatedProtocol);
    
    // Record version history
    const versionData = {
      changes: changes,
      updatedBy: this.currentSender,
      updatedAt: this.blockHeight
    };
    
    this.mapSet('protocol-versions',
        { 'protocol-id': protocolId, version: this.blockHeight },
        versionData
    );
    
    return { ok: true };
  }
  
  deactivateProtocol(protocolId) {
    const protocol = this.mapGet('protocols', { 'protocol-id': protocolId });
    if (!protocol) {
      return { error: 'Protocol not found' };
    }
    
    // Check authorization
    if (protocol.createdBy !== this.currentSender) {
      return { error: 'Unauthorized' };
    }
    
    const updatedProtocol = {
      ...protocol,
      isActive: false
    };
    
    this.mapSet('protocols', { 'protocol-id': protocolId }, updatedProtocol);
    return { ok: true };
  }
  
  getProtocol(protocolId) {
    return this.mapGet('protocols', { 'protocol-id': protocolId });
  }
  
  getProtocolVersion(protocolId, version) {
    return this.mapGet('protocol-versions', { 'protocol-id': protocolId, version: version });
  }
  
  isProtocolActive(protocolId) {
    const protocol = this.mapGet('protocols', { 'protocol-id': protocolId });
    return protocol ? protocol.isActive : false;
  }
}

describe('Enhancement Protocol Contract', () => {
  let contract;
  
  beforeEach(() => {
    contract = new MockEnhancementProtocolContract();
  });
  
  describe('Protocol Creation', () => {
    it('should create a memory enhancement protocol successfully', () => {
      const result = contract.createProtocol(
          'Advanced Memory Training',
          'Comprehensive memory enhancement program using spaced repetition',
          contract.PROTOCOL_MEMORY,
          'Daily 30-minute sessions with progressive difficulty levels',
          8,
          1
      );
      
      expect(result.ok).toBe(1);
      
      const protocol = contract.getProtocol(1);
      expect(protocol).toBeTruthy();
      expect(protocol.name).toBe('Advanced Memory Training');
      expect(protocol.protocolType).toBe(contract.PROTOCOL_MEMORY);
      expect(protocol.durationWeeks).toBe(8);
      expect(protocol.isActive).toBe(true);
      expect(protocol.createdBy).toBe(contract.currentSender);
    });
    
    it('should create protocols for all cognitive domains', () => {
      const protocols = [
        { name: 'Memory Protocol', type: contract.PROTOCOL_MEMORY },
        { name: 'Attention Protocol', type: contract.PROTOCOL_ATTENTION },
        { name: 'Processing Protocol', type: contract.PROTOCOL_PROCESSING },
        { name: 'Learning Protocol', type: contract.PROTOCOL_LEARNING },
        { name: 'Creativity Protocol', type: contract.PROTOCOL_CREATIVITY }
      ];
      
      protocols.forEach((proto, index) => {
        const result = contract.createProtocol(
            proto.name,
            `Description for ${proto.name}`,
            proto.type,
            `Methodology for ${proto.name}`,
            6,
            1
        );
        expect(result.ok).toBe(index + 1);
      });
      
      // Verify all protocols were created
      for (let i = 1; i <= 5; i++) {
        const protocol = contract.getProtocol(i);
        expect(protocol).toBeTruthy();
        expect(protocol.protocolType).toBe(i);
      }
    });
    
    it('should reject protocol with invalid name length', () => {
      const longName = 'A'.repeat(101);
      const result = contract.createProtocol(
          longName,
          'Valid description',
          contract.PROTOCOL_MEMORY,
          'Valid methodology',
          8,
          1
      );
      
      expect(result.error).toBe('Invalid name');
    });
    
    it('should reject protocol with invalid description length', () => {
      const longDescription = 'A'.repeat(501);
      const result = contract.createProtocol(
          'Valid Name',
          longDescription,
          contract.PROTOCOL_MEMORY,
          'Valid methodology',
          8,
          1
      );
      
      expect(result.error).toBe('Invalid description');
    });
    
    it('should reject protocol with invalid protocol type', () => {
      const result = contract.createProtocol(
          'Valid Name',
          'Valid description',
          6, // Invalid type (> PROTOCOL_CREATIVITY)
          'Valid methodology',
          8,
          1
      );
      
      expect(result.error).toBe('Invalid protocol type');
    });
    
    it('should reject protocol with invalid methodology length', () => {
      const longMethodology = 'A'.repeat(1001);
      const result = contract.createProtocol(
          'Valid Name',
          'Valid description',
          contract.PROTOCOL_MEMORY,
          longMethodology,
          8,
          1
      );
      
      expect(result.error).toBe('Invalid methodology');
    });
    
    it('should reject protocol with zero duration', () => {
      const result = contract.createProtocol(
          'Valid Name',
          'Valid description',
          contract.PROTOCOL_MEMORY,
          'Valid methodology',
          0, // Invalid duration
          1
      );
      
      expect(result.error).toBe('Invalid duration');
    });
  });
  
  describe('Protocol Updates', () => {
    beforeEach(() => {
      // Create a protocol first
      contract.createProtocol(
          'Test Protocol',
          'Test description',
          contract.PROTOCOL_MEMORY,
          'Original methodology',
          8,
          1
      );
    });
    
    it('should update protocol methodology successfully', () => {
      const newMethodology = 'Updated methodology with new techniques';
      const changes = 'Added advanced spaced repetition algorithms';
      
      const result = contract.updateProtocol(1, newMethodology, changes);
      
      expect(result.ok).toBe(true);
      
      const protocol = contract.getProtocol(1);
      expect(protocol.methodology).toBe(newMethodology);
    });
    
    it('should record version history when updating', () => {
      const newMethodology = 'Updated methodology';
      const changes = 'Version 2.0 improvements';
      
      contract.updateProtocol(1, newMethodology, changes);
      
      const version = contract.getProtocolVersion(1, contract.blockHeight);
      expect(version).toBeTruthy();
      expect(version.changes).toBe(changes);
      expect(version.updatedBy).toBe(contract.currentSender);
      expect(version.updatedAt).toBe(contract.blockHeight);
    });
    
    it('should reject update by unauthorized user', () => {
      contract.setTxSender('ST2DIFFERENT_ADDRESS');
      
      const result = contract.updateProtocol(1, 'New methodology', 'Changes');
      
      expect(result.error).toBe('Unauthorized');
    });
    
    it('should reject update of non-existent protocol', () => {
      const result = contract.updateProtocol(999, 'New methodology', 'Changes');
      
      expect(result.error).toBe('Protocol not found');
    });
    
    it('should reject update with invalid methodology length', () => {
      const longMethodology = 'A'.repeat(1001);
      
      const result = contract.updateProtocol(1, longMethodology, 'Changes');
      
      expect(result.error).toBe('Invalid methodology');
    });
    
    it('should reject update with invalid changes description length', () => {
      const longChanges = 'A'.repeat(501);
      
      const result = contract.updateProtocol(1, 'Valid methodology', longChanges);
      
      expect(result.error).toBe('Invalid changes description');
    });
    
    it('should maintain multiple version history entries', () => {
      // First update
      contract.setBlockHeight(1001);
      contract.updateProtocol(1, 'Version 2 methodology', 'Version 2 changes');
      
      // Second update
      contract.setBlockHeight(1002);
      contract.updateProtocol(1, 'Version 3 methodology', 'Version 3 changes');
      
      const version2 = contract.getProtocolVersion(1, 1001);
      const version3 = contract.getProtocolVersion(1, 1002);
      
      expect(version2.changes).toBe('Version 2 changes');
      expect(version3.changes).toBe('Version 3 changes');
    });
  });
  
  describe('Protocol Deactivation', () => {
    beforeEach(() => {
      // Create a protocol first
      contract.createProtocol(
          'Test Protocol',
          'Test description',
          contract.PROTOCOL_MEMORY,
          'Test methodology',
          8,
          1
      );
    });
    
    it('should deactivate protocol successfully', () => {
      const result = contract.deactivateProtocol(1);
      
      expect(result.ok).toBe(true);
      
      const protocol = contract.getProtocol(1);
      expect(protocol.isActive).toBe(false);
    });
    
    it('should reject deactivation by unauthorized user', () => {
      contract.setTxSender('ST2DIFFERENT_ADDRESS');
      
      const result = contract.deactivateProtocol(1);
      
      expect(result.error).toBe('Unauthorized');
    });
    
    it('should reject deactivation of non-existent protocol', () => {
      const result = contract.deactivateProtocol(999);
      
      expect(result.error).toBe('Protocol not found');
    });
  });
  
  describe('Protocol Queries', () => {
    beforeEach(() => {
      // Create multiple protocols
      contract.createProtocol(
          'Active Protocol',
          'Active description',
          contract.PROTOCOL_MEMORY,
          'Active methodology',
          8,
          1
      );
      
      contract.createProtocol(
          'Inactive Protocol',
          'Inactive description',
          contract.PROTOCOL_ATTENTION,
          'Inactive methodology',
          6,
          2
      );
      
      // Deactivate second protocol
      contract.deactivateProtocol(2);
    });
    
    it('should retrieve protocol details correctly', () => {
      const protocol = contract.getProtocol(1);
      
      expect(protocol).toBeTruthy();
      expect(protocol.name).toBe('Active Protocol');
      expect(protocol.protocolType).toBe(contract.PROTOCOL_MEMORY);
      expect(protocol.durationWeeks).toBe(8);
      expect(protocol.institutionId).toBe(1);
    });
    
    it('should return null for non-existent protocol', () => {
      const protocol = contract.getProtocol(999);
      
      expect(protocol).toBeNull();
    });
    
    it('should check protocol active status correctly', () => {
      expect(contract.isProtocolActive(1)).toBe(true);
      expect(contract.isProtocolActive(2)).toBe(false);
      expect(contract.isProtocolActive(999)).toBe(false);
    });
    
    it('should return null for non-existent protocol version', () => {
      const version = contract.getProtocolVersion(1, 999);
      
      expect(version).toBeNull();
    });
  });
  
  describe('Multiple Protocol Scenarios', () => {
    it('should handle protocols from different institutions', () => {
      const address1 = 'ST1INSTITUTION1';
      const address2 = 'ST2INSTITUTION2';
      
      contract.setTxSender(address1);
      contract.createProtocol(
          'Institution 1 Protocol',
          'Description 1',
          contract.PROTOCOL_MEMORY,
          'Methodology 1',
          8,
          1
      );
      
      contract.setTxSender(address2);
      contract.createProtocol(
          'Institution 2 Protocol',
          'Description 2',
          contract.PROTOCOL_ATTENTION,
          'Methodology 2',
          6,
          2
      );
      
      const protocol1 = contract.getProtocol(1);
      const protocol2 = contract.getProtocol(2);
      
      expect(protocol1.createdBy).toBe(address1);
      expect(protocol2.createdBy).toBe(address2);
      expect(protocol1.institutionId).toBe(1);
      expect(protocol2.institutionId).toBe(2);
    });
    
    it('should maintain protocol independence for updates', () => {
      const address1 = 'ST1INSTITUTION1';
      const address2 = 'ST2INSTITUTION2';
      
      // Create protocols from different addresses
      contract.setTxSender(address1);
      contract.createProtocol('Protocol 1', 'Desc 1', contract.PROTOCOL_MEMORY, 'Method 1', 8, 1);
      
      contract.setTxSender(address2);
      contract.createProtocol('Protocol 2', 'Desc 2', contract.PROTOCOL_ATTENTION, 'Method 2', 6, 2);
      
      // Try to update protocol 1 from address2 (should fail)
      const result1 = contract.updateProtocol(1, 'New methodology', 'Changes');
      expect(result1.error).toBe('Unauthorized');
      
      // Update protocol 2 from address2 (should succeed)
      const result2 = contract.updateProtocol(2, 'New methodology', 'Changes');
      expect(result2.ok).toBe(true);
      
      // Switch back to address1 and update protocol 1 (should succeed)
      contract.setTxSender(address1);
      const result3 = contract.updateProtocol(1, 'New methodology', 'Changes');
      expect(result3.ok).toBe(true);
    });
    
    it('should handle protocol lifecycle correctly', () => {
      // Create protocol
      contract.createProtocol(
          'Lifecycle Test Protocol',
          'Testing protocol lifecycle',
          contract.PROTOCOL_LEARNING,
          'Initial methodology',
          10,
          1
      );
      
      // Verify initial state
      expect(contract.isProtocolActive(1)).toBe(true);
      
      // Update protocol
      contract.updateProtocol(1, 'Updated methodology', 'First update');
      
      // Verify still active after update
      expect(contract.isProtocolActive(1)).toBe(true);
      
      const protocol = contract.getProtocol(1);
      expect(protocol.methodology).toBe('Updated methodology');
      
      // Deactivate protocol
      contract.deactivateProtocol(1);
      
      // Verify deactivated
      expect(contract.isProtocolActive(1)).toBe(false);
      
      // Try to update deactivated protocol (should still work if authorized)
      const updateResult = contract.updateProtocol(1, 'Post-deactivation update', 'Update after deactivation');
      expect(updateResult.ok).toBe(true);
    });
  });
});
