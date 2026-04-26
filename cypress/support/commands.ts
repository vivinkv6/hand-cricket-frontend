/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      connectToRoom(roomId: string, playerName: string): Chainable<void>;
      selectNumber(num: number): Chainable<void>;
      selectBowler(bowlerId: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('connectToRoom', (roomId: string, playerName: string) => {
  cy.visit(`/room/${roomId}`);
  cy.get('input').first().type(playerName);
  cy.get('button').contains(/join|enter/i).click();
});

Cypress.Commands.add('selectNumber', (num: number) => {
  cy.get('button').contains(String(num)).click();
});

Cypress.Commands.add('selectBowler', (bowlerId: string) => {
  cy.get(`[data-bowler-id="${bowlerId}"]`).click();
});

export {};