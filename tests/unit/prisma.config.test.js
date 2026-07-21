describe('Prisma client configuration', () => {
  test('constructs a Prisma client from the current process URL without connecting', () => {
    jest.isolateModules(() => {
      jest.unmock('../../src/config/prisma');
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:55432/morocco_medication_test';
      const prisma = require('../../src/config/prisma');
      expect(prisma).toHaveProperty('$connect');
      expect(prisma).toHaveProperty('medication');
    });
  });
});
