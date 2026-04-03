// Feature: react-native-game-migration, Property 9: Formato de mensajes con timestamp y remitente

import * as fc from 'fast-check';
import { formatChatMessage } from '../../utils/chatUtils';

describe('Property 9: Formato de mensajes con timestamp y remitente', () => {
  // **Validates: Requirements 10.2**

  it('el resultado contiene el nombre del remitente y una representación de tiempo', () => {
    fc.assert(
      fc.property(
        fc.record({
          timestamp: fc.date(),
          sender: fc.string({ minLength: 1 }),
          content: fc.string(),
        }),
        ({ timestamp, sender, content }) => {
          const result = formatChatMessage({
            content,
            created_at: timestamp.toISOString(),
            sender_username: sender,
          });

          // Must contain the sender name
          const containsSender = result.includes(sender);

          // Must contain a time pattern [HH:MM]
          const containsTime = /\[\d{2}:\d{2}\]/.test(result);

          return containsSender && containsTime;
        }
      ),
      { numRuns: 100 }
    );
  });
});
