describe('User Permissions and Role-Based Access', () => {
  const examName = 'Admin Secret Physics Exam ' + Date.now();

  it('Admin: Can create, save, and see the exam in the pool', () => {
    cy.login('admin');
    cy.get('[data-cy="nav-create-exam"]').click();

    // insert required exam meta-data
    cy.get('[data-cy="course-name-input"]').clear().type(examName);
    cy.get('[data-cy="examiner-input"]').clear().type('Dr. Admin');
    cy.get('[data-cy="save-meta"]').click();

    // Intercept the specific save call from ApiService
    cy.intercept('POST', '/api/exams').as('saveExam');

    // Save and verify network success
    cy.get('[data-cy="save"]').click();
    cy.wait('@saveExam').its('response.statusCode').should('eq', 200);

    // Verify it appears in the Exam Pool
    cy.visit('/dashboard');
    cy.get('[data-cy="nav-exams-pool"]').click();
    cy.contains(examName).should('be.visible');
  });

  it("Student: Is denied access to save and see the admin's exam", () => {
    // Intercept the specific save call from ApiService
    cy.intercept('GET', '/api/exams').as('getExams');

    cy.login('student');
    cy.visit('/dashboard');

    // Verify API Denial for fetching exams
    cy.get('[data-cy="nav-exams-pool"]').click();

    // Even if the UI tries to load, the student shouldn't see the admin's exam
    cy.wait('@getExams').then(interception => {
      expect(interception.response?.body).to.be.empty;
    });
    cy.contains(examName).should('not.exist');

    // Verify API Denial for saving
    cy.visit('/dashboard');
    cy.get('[data-cy="nav-create-exam"]').click();
    cy.intercept('POST', '/api/exams').as('deniedSave');

    // insert required exam meta-data
    cy.get('[data-cy="course-name-input"]').clear().type('Student Exam');
    cy.get('[data-cy="examiner-input"]').clear().type('Student');
    cy.get('[data-cy="save-meta"]').click();

    cy.get('[data-cy="save"]').click();

    // Backend must reject this
    cy.wait('@deniedSave')
      .its('response.statusCode')
      .should('be.oneOf', [401, 403]);

    // Verify it does not appears in the Exam Pool
    cy.visit('/exams-pool');
    cy.contains(examName).should('not.exist');
  });
});
