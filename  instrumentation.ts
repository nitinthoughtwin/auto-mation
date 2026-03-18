import { runMigrations } from './src/lib/migrations';

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Server] Starting GPMart Studio...');
    
    // Run database migrations
    await runMigrations();
    
    console.log('[Server] GPMart Studio ready!');
  }
}
