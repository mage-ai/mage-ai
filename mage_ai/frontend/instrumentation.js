export async function register() {	
    if (process.env.NEXT_RUNTIME === 'nodejs') {	
      console.log('Registering instrumentation for nodejs')	
      await import('./instrumentation.node.js')	
    }	
  }	
