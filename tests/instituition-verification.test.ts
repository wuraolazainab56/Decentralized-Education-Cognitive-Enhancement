// Outcome Measurement Contract Tests
// Testing participant enrollment, measurements, and outcome tracking

import { describe, it, expect, beforeEach } from 'vitest';

// Mock Clarity contract environment for Outcome Measurement
class MockOutcomeMeasurementContract {
  constructor() {
    this.maps = new Map();
    this.variables = new Map();
    this.currentSender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    this.blockHeight = 1000;
    
    // Initialize variables
    this.variables.set('next-participant-id', 1);
    
    // Measurement type constants
    this.MEASURE_PRE_ASSESSMENT = 1;
    this.MEASURE_POST_ASSESSMENT = 2;
    this.MEASURE_FOLLOW_UP = 3;
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
  
  // Outcome Measurement Contract Functions
  enrollParticipant(protocolId, institutionId) {
    const participantId = this.varGet('next-participant-id');
    
    const participant = {
      protocolId: protocolId,
      institutionId: institutionId,
      enrolledBy: this.currentSender,
      enrollmentDate: this.blockHeight,
      completionDate: null,
      isActive: true
    };
    
    this.mapSet('participants', { 'participant-id': participantId }, participant);
    this.varSet('next-participant-id', participantId + 1);
    
    return { ok: participantId };
  }
  
  recordMeasurement(participantId, measurementType, cognitiveScore, memoryScore,
                    attentionScore, processingScore, learningScore, creativityScore, notes) {
    // Validate measurement type
    if (measurementType > this.MEASURE_FOLLOW_UP) {
      return { error: 'Invalid measurement type' };
    }
    
    // Validate scores (0-100)
    const scores = [cognitiveScore, memoryScore, attentionScore, processingScore, learningScore, creativityScore];
    for (const score of scores) {
      if (score > 100) {
        return { error: 'Invalid score' };
      }
    }
    
    // Check if measurement already exists
    const existingMeasurement = this.mapGet('measurements',
        { 'participant-id': participantId, 'measurement-type': measurementType });
    if (existingMeasurement) {
      return { error: 'Duplicate measurement' };
    }
    
    const measurement = {
      cognitiveScore: cognitiveScore,
      memoryScore: memoryScore,
      attentionScore: attentionScore,
      processingScore: processingScore,
      learningScore: learningScore,
      creativityScore: creativityScore,
      measuredBy: this.currentSender,
      measurementDate: this.blockHeight,
      notes: notes
    };
    
    this.mapSet('measurements',
        { 'participant-id': participantId, 'measurement-type': measurementType },
        measurement);
    
    return { ok: true };
  }
  
  completeParticipant(participantId) {
    const participant = this.mapGet('participants', { 'participant-id': participantId });
    if (!participant) {
      return { error: 'Participant not found' };
    }
    
    // Check authorization
    if (participant.enrolledBy !== this.currentSender) {
      return { error: 'Unauthorized' };
    }
    
    const updatedParticipant = {
      ...participant,
      completionDate: this.blockHeight,
      isActive: false
    };
    
    this.mapSet('participants', { 'participant-id': participantId }, updatedParticipant);
    return { ok: true };
  }
  
  getParticipant(participantId) {
    return this.mapGet('participants', { 'participant-id': participantId });
  }
  
  getMeasurement(participantId, measurementType) {
    return this.mapGet('measurements',
        { 'participant-id': participantId, 'measurement-type': measurementType });
  }
  
  calculateImprovement(participantId) {
    const preAssessment = this.getMeasurement(participantId, this.MEASURE_PRE_ASSESSMENT);
    const postAssessment = this.getMeasurement(participantId, this.MEASURE_POST_ASSESSMENT);
    
    if (!preAssessment || !postAssessment) {
      return null;
    }
    
    return postAssessment.cognitiveScore - preAssessment.cognitiveScore;
  }
}

describe('Outcome Measurement Contract', () => {
  let contract;
  
  beforeEach(() => {
    contract = new MockOutcomeMeasurementContract();
  });
  
  describe('Participant Enrollment', () => {
    it('should enroll participant successfully', () => {
      const result = contract.enrollParticipant(1, 1);
      
      expect(result.ok).toBe(1);
      
      const participant = contract.getParticipant(1);
      expect(participant).toBeTruthy();
      expect(participant.protocolId).toBe(1);
      expect(participant.institutionId).toBe(1);
      expect(participant.enrolledBy).toBe(contract.currentSender);
      expect(participant.isActive).toBe(true);
      expect(participant.completionDate).toBeNull();
    });
    
    it('should increment participant ID for multiple enrollments', () => {
      const result1 = contract.enrollParticipant(1, 1);
      const result2 = contract.enrollParticipant(2, 1);
      const result3 = contract.enrollParticipant(1, 2);
      
      expect(result1.ok).toBe(1);
      expect(result2.ok).toBe(2);
      expect(result3.ok).toBe(3);
    });
    
    it('should handle enrollments from different addresses', () => {
      const address1 = 'ST1ADDRESS1';
      const address2 = 'ST2ADDRESS2';
      
      contract.setTxSender(address1);
      const result1 = contract.enrollParticipant(1, 1);
      
      contract.setTxSender(address2);
      const result2 = contract.enrollParticipant(1, 2);
      
      const participant1 = contract.getParticipant(result1.ok);
      const participant2 = contract.getParticipant(result2.ok);
      
      expect(participant1.enrolledBy).toBe(address1);
      expect(participant2.enrolledBy).toBe(address2);
    });
  });
  
  describe('Measurement Recording', () => {
    beforeEach(() => {
      // Enroll a participant first
      contract.enrollParticipant(1, 1);
    });
    
    it('should record pre-assessment measurement successfully', () => {
      const result = contract.recordMeasurement(
          1, // participant-id
          contract.MEASURE_PRE_ASSESSMENT,
          75, // cognitive-score
          70, // memory-score
          80, // attention-score
          75, // processing-score
          85, // learning-score
          70, // creativity-score
          'Baseline assessment completed'
      );
      
      expect(result.ok).toBe(true);
      
      const measurement = contract.getMeasurement(1, contract.MEASURE_PRE_ASSESSMENT);
      expect(measurement).toBeTruthy();
      expect(measurement.cognitiveScore).toBe(75);
      expect(measurement.memoryScore).toBe(70);
      expect(measurement.attentionScore).toBe(80);
      expect(measurement.notes).toBe('Baseline assessment completed');
      expect(measurement.measuredBy).toBe(contract.currentSender);
    });
    
    it('should record all measurement types', () => {
      const measurementTypes = [
        { type: contract.MEASURE_PRE_ASSESSMENT, notes: 'Pre-assessment' },
        { type: contract.MEASURE_POST_ASSESSMENT, notes: 'Post-assessment' },
        { type: contract.MEASURE_FOLLOW_UP, notes: 'Follow-up assessment' }
      ];
      
      measurementTypes.forEach((measurement, index) => {
        contract.setBlockHeight(1000 + index);
        const result = contract.recordMeasurement(
            1, measurement.type, 75, 70, 80, 75, 85, 70, measurement.notes
        );
        expect(result.ok).toBe(true);
      });
      
      // Verify all measurements were recorded
      measurementTypes.forEach(measurement => {
        const recorded = contract.getMeasurement(1, measurement.type);
        expect(recorded).toBeTruthy();
        expect(recorded.notes).toBe(measurement.notes);
      });
    });
    
    it('should reject measurement with invalid type', () => {
      const result = contract.recordMeasurement(
          1, 4, 75, 70, 80, 75, 85, 70, 'Invalid type'
      );
      
      expect(result.error).toBe('Invalid measurement type');
    });
    
    it('should reject measurement with invalid scores', () => {
      const result = contract.recordMeasurement(
          1, contract.MEASURE_PRE_ASSESSMENT,
          101, 70, 80, 75, 85, 70, 'Invalid score'
      );
      
      expect(result.error).toBe('Invalid score');
    });
    
    it('should reject duplicate measurements', () => {
      // Record first measurement
      contract.recordMeasurement(
          1, contract.MEASURE_PRE_ASSESSMENT,
          75, 70, 80, 75, 85, 70, 'First measurement'
      );
      
      // Try to record duplicate
      const result = contract.recordMeasurement(
          1, contract.MEASURE_PRE_ASSESSMENT,
          80, 75, 85, 80, 90, 75, 'Duplicate measurement'
      );
      
      expect(result.error).toBe('Duplicate measurement');
    });
    
    it('should validate all score parameters', () => {
      const invalidScores = [
        [101, 70, 80, 75, 85, 70], // cognitive > 100
        [75, 101, 80, 75, 85, 70], // memory > 100
        [75, 70, 101, 75, 85, 70], // attention > 100
        [75, 70, 80, 101, 85, 70], // processing > 100
        [75, 70, 80, 75, 101, 70], // learning > 100
        [75, 70, 80, 75, 85, 101]  // creativity > 100
      ];
      
      invalidScores.forEach(scores => {
        const result = contract.recordMeasurement(
            1, contract.MEASURE_PRE_ASSESSMENT,
            ...scores, 'Invalid score test'
        );
        expect(result.error).toBe('Invalid score');
      });
    });
  });
  
  describe('Participant Completion', () => {
    beforeEach(() => {
      // Enroll a participant
      contract.enrollParticipant(1, 1);
    });
    
    it('should complete participant successfully', () => {
      const result = contract.completeParticipant(1);
      
      expect(result.ok).toBe(true);
      
      const participant = contract.getParticipant(1);
      expect(participant.isActive).toBe(false);
      expect(participant.completionDate).toBe(contract.blockHeight);
    });
    
    it('should reject completion by unauthorized user', () => {
      contract.setTxSender('ST2DIFFERENT_ADDRESS');
      
      const result = contract.completeParticipant(1);
      
      expect(result.error).toBe('Unauthorized');
    });
    
    it('should reject completion of non-existent participant', () => {
      const result = contract.completeParticipant(999);
      
      expect(result.error).toBe('Participant not found');
    });
  });
  
  describe('Improvement Calculation', () => {
    beforeEach(() => {
      // Enroll participant and record measurements
      contract.enrollParticipant(1, 1);
    });
    
    it('should calculate improvement correctly', () => {
      // Record pre-assessment
      contract.recordMeasurement(
          1, contract.MEASURE_PRE_ASSESSMENT,
          70, 65, 75, 70, 80, 65, 'Pre-assessment'
      );
      
      // Record post-assessment
      contract.recordMeasurement(
          1, contract.MEASURE_POST_ASSESSMENT,
          85, 80, 90, 85, 95, 80, 'Post-assessment'
      );
      
      const improvement = contract.calculateImprovement(1);
      expect(improvement).toBe(15); // 85 - 70
    });
    
    it('should return null when pre-assessment is missing', () => {
      // Only record post-assessment
      contract.recordMeasurement(
          1, contract.MEASURE_POST_ASSESSMENT,
          85, 80, 90, 85, 95, 80, 'Post-assessment only'
      );
      
      const improvement = contract.calculateImprovement(1);
      expect(improvement).toBeNull();
    });
    
    it('should return null when post-assessment is missing', () => {
      // Only record pre-assessment
      contract.recordMeasurement(
          1, contract.MEASURE_PRE_ASSESSMENT,
          70, 65, 75, 70, 80, 65, 'Pre-assessment only'
      );
      
      const improvement = contract.calculateImprovement(1);
      expect(improvement).toBeNull();
    });
    
    it('should handle negative improvement (decline)', () => {
      // Record pre-assessment with higher score
      contract.recordMeasurement(
          1, contract.MEASURE_PRE_ASSESSMENT,
          85, 80, 90, 85, 95, 80, 'High pre-assessment'
      );
      
      // Record post-assessment with lower score
      contract.recordMeasurement(
          1, contract.MEASURE_POST_ASSESSMENT,
          70, 65, 75, 70, 80, 65, 'Lower post-assessment'
      );
      
      const improvement = contract.calculateImprovement(1);
      expect(improvement).toBe(-15); // 70 - 85
    });
  });
  
  describe('Query Operations', () => {
    beforeEach(() => {
      // Set up test data
      contract.enrollParticipant(1, 1);
      contract.enrollParticipant(2, 2);
      
      contract.recordMeasurement(
          1, contract.MEASURE_PRE_ASSESSMENT,
          75, 70, 80, 75, 85, 70, 'Participant 1 pre'
      );
      
      contract.recordMeasurement(
          2, contract.MEASURE_PRE_ASSESSMENT,
          80, 75, 85, 80, 90, 75, 'Participant 2 pre'
      );
    });
    
    it('should retrieve participant details correctly', () => {
      const participant = contract.getParticipant(1);
      
      expect(participant).toBeTruthy();
      expect(participant.protocolId).toBe(1);
      expect(participant.institutionId).toBe(1);
      expect(participant.isActive).toBe(true);
    });
    
    it('should return null for non-existent participant', () => {
      const participant = contract.getParticipant(999);
      
      expect(participant).toBeNull();
    });
    
    it('should retrieve measurement details correctly', () => {
      const measurement = contract.getMeasurement(1, contract.MEASURE_PRE_ASSESSMENT);
      
      expect(measurement).toBeTruthy();
      expect(measurement.cognitiveScore).toBe(75);
      expect(measurement.memoryScore).toBe(70);
      expect(measurement.notes).toBe('Participant 1 pre');
    });
    
    it('should return null for non-existent measurement', () => {
      const measurement = contract.getMeasurement(1, contract.MEASURE_POST_ASSESSMENT);
      
      expect(measurement).toBeNull();
    });
    
    it('should return null for measurement of non-existent participant', () => {
      const measurement = contract.getMeasurement(999, contract.MEASURE_PRE_ASSESSMENT);
      
      expect(measurement).toBeNull();
    });
  });
  
  describe('Complete Participant Workflow', () => {
    it('should handle complete participant lifecycle', () => {
      // 1. Enroll participant
      const enrollResult = contract.enrollParticipant(1, 1);
      expect(enrollResult.ok).toBe(1);
      
      // 2. Record pre-assessment
      contract.setBlockHeight(1001);
      const preResult = contract.recordMeasurement(
          1, contract.MEASURE_PRE_ASSESSMENT,
          65, 60, 70, 65, 75, 60, 'Baseline assessment'
      );
      expect(preResult.ok).toBe(true);
      
      // 3. Record post-assessment (after protocol completion)
      contract.setBlockHeight(1050);
      const postResult = contract.recordMeasurement(
          1, contract.MEASURE_POST_ASSESSMENT,
          80, 75, 85, 80, 90, 75, 'Post-protocol assessment'
      );
      expect(postResult.ok).toBe(true);
      
      // 4. Calculate improvement
      const improvement = contract.calculateImprovement(1);
      expect(improvement).toBe(15);
      
      // 5. Record follow-up assessment
      contract.setBlockHeight(1100);
      const followUpResult = contract.recordMeasurement(
          1, contract.MEASURE_FOLLOW_UP,
          78, 73, 83, 78, 88, 73, 'Follow-up assessment'
      );
      expect(followUpResult.ok).toBe(true);
      
      // 6. Complete participant
      const completeResult = contract.completeParticipant(1);
      expect(completeResult.ok).toBe(true);
      
      // 7. Verify final state
      const participant = contract.getParticipant(1);
      expect(participant.isActive).toBe(false);
      expect(participant.completionDate).toBe(1100);
      
      // Verify all measurements exist
      const pre = contract.getMeasurement(1, contract.MEASURE_PRE_ASSESSMENT);
      const post = contract.getMeasurement(1, contract.MEASURE_POST_ASSESSMENT);
      const followUp = contract.getMeasurement(1, contract.MEASURE_FOLLOW_UP);
      
      expect(pre).toBeTruthy();
      expect(post).toBeTruthy();
      expect(followUp).toBeTruthy();
    });
    
    it('should handle multiple participants in same protocol', () => {
      // Enroll multiple participants
      contract.enrollParticipant(1, 1); // Participant 1
      contract.enrollParticipant(1, 1); // Participant 2, same protocol
      contract.enrollParticipant(2, 1); // Participant 3, different protocol
      
      // Record measurements for all participants
      [1, 2, 3].forEach(participantId => {
        contract.recordMeasurement(
            participantId, contract.MEASURE_PRE_ASSESSMENT,
            70 + participantId, 65 + participantId, 75 + participantId,
            70 + participantId, 80 + participantId, 65 + participantId,
            `Participant ${participantId} pre-assessment`
        );
      });
      
      // Verify all measurements were recorded correctly
      [1, 2, 3].forEach(participantId => {
        const measurement = contract.getMeasurement(participantId, contract.MEASURE_PRE_ASSESSMENT);
        expect(measurement).toBeTruthy();
        expect(measurement.cognitiveScore).toBe(70 + participantId);
      });
      
      // Complete participants individually
      contract.completeParticipant(1);
      contract.completeParticipant(3);
      
      // Verify completion status
      expect(contract.getParticipant(1).isActive).toBe(false);
      expect(contract.getParticipant(2).isActive).toBe(true);
      expect(contract.getParticipant(3).isActive).toBe(false);
    });
  });
});
