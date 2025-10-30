/**
 * Sanitizes errors before sending to clients
 * Logs full error details server-side, returns safe messages to clients
 */
export function sanitizeError(error: unknown, requestId: string): { error: string; requestId: string } {
  // Log full error server-side for debugging
  console.error('[ERROR]', { requestId, error });

  let message = 'Erro interno do servidor';

  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase();
    
    // Map specific errors to user-friendly messages
    if (errorMsg.includes('unauthorized') || errorMsg.includes('not authorized')) {
      message = 'Acesso negado';
    } else if (errorMsg.includes('not found')) {
      message = 'Recurso não encontrado';
    } else if (errorMsg.includes('invalid') || errorMsg.includes('validation')) {
      message = 'Dados inválidos';
    } else if (errorMsg.includes('exists') || errorMsg.includes('duplicate')) {
      message = 'Recurso já existe';
    } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
      message = 'Muitas tentativas. Tente novamente mais tarde.';
    }
  }

  return { error: message, requestId };
}

/**
 * Checks rate limit for authentication endpoints using database
 */
export async function checkRateLimit(
  supabase: any,
  identifier: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<{ allowed: boolean; lockedUntil?: Date }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  // Check current rate limit
  const { data: rateLimit, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('[RATE-LIMIT] Error checking rate limit:', error);
    return { allowed: true }; // Fail open on error
  }

  // Check if locked
  if (rateLimit?.locked_until) {
    const lockedUntil = new Date(rateLimit.locked_until);
    if (lockedUntil > now) {
      return { allowed: false, lockedUntil };
    }
  }

  // Check if within rate limit window
  if (rateLimit) {
    const windowStartTime = new Date(rateLimit.window_start);
    
    if (windowStartTime > windowStart) {
      // Still within window
      if (rateLimit.attempt_count >= maxAttempts) {
        // Lock for 15 minutes
        const lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
        await supabase
          .from('rate_limits')
          .update({ locked_until: lockedUntil.toISOString() })
          .eq('identifier', identifier);
        
        return { allowed: false, lockedUntil };
      }

      // Increment attempt count
      await supabase
        .from('rate_limits')
        .update({ attempt_count: rateLimit.attempt_count + 1 })
        .eq('identifier', identifier);
      
      return { allowed: true };
    }
  }

  // Create or reset rate limit record
  await supabase
    .from('rate_limits')
    .upsert({
      identifier,
      attempt_count: 1,
      window_start: now.toISOString(),
      locked_until: null
    });

  return { allowed: true };
}
