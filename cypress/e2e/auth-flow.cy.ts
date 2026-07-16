describe('Authentication Flow', () => {
  it('Logs in as admin and then logs out', () => {
    cy.login('admin');
    cy.url().should('not.include', '/login');

    cy.get('[data-cy="user-menu-button"]').click();
    cy.get('[data-cy="logout-button"]').click();
    cy.url().should('include', '/login');
    cy.get('button[name="login"]').should('be.visible');
  });
});
