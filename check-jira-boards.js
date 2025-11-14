// Script para verificar el estado de los boards guardados en localStorage
console.log('🔍 Verificando boards guardados en localStorage...\n');

try {
  const boardsData = localStorage.getItem('jira-boards');
  
  if (!boardsData) {
    console.log('❌ No hay boards guardados en localStorage');
  } else {
    const data = JSON.parse(boardsData);
    console.log('📦 Boards guardados:', {
      email: data.email,
      totalBoards: data.boards?.length || 0
    });
    
    if (data.boards && data.boards.length > 0) {
      console.log('\n📋 Lista de boards:\n');
      data.boards.forEach((board, index) => {
        console.log(`Board ${index + 1}:`);
        console.log(`  - ID: ${board.id}`);
        console.log(`  - Name: ${board.name}`);
        console.log(`  - Project Key: ${board.projectKey || '❌ MISSING'}`);
        console.log(`  - URL: ${board.url || '❌ MISSING'}`);
        console.log('');
      });
      
      // Check if migration is needed
      const needsMigration = data.boards.some(b => !b.projectKey);
      if (needsMigration) {
        console.log('⚠️  ATENCIÓN: Hay boards sin projectKey que necesitan migración');
      } else {
        console.log('✅ Todos los boards tienen projectKey');
      }
    }
  }
} catch (error) {
  console.error('Error al leer boards:', error);
}
