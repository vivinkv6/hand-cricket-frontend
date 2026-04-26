export class HomePage {
  visit() {
    cy.visit('/');
    return this;
  }

  get title() {
    return cy.contains('Hand Cricket Arena');
  }

  get soloMode() {
    return cy.contains('Solo');
  }

  get duelMode() {
    return cy.contains('1v1');
  }

  get teamMode() {
    return cy.contains('Teams');
  }

  get playerNameInput() {
    return cy.get('input[placeholder="Enter your name"]');
  }

  get playNowButton() {
    return cy.contains('Play Now');
  }

  get createRoomButton() {
    return cy.contains('Create Room');
  }

  get teamSizeButton() {
    return cy.contains('2v2');
  }

  selectMode(mode: 'solo' | 'duel' | 'team') {
    const modes = { solo: this.soloMode, duel: this.duelMode, team: this.teamMode };
    modes[mode].click();
    return this;
  }

  enterPlayerName(name: string) {
    this.playerNameInput.clear().type(name);
    return this;
  }
}

export class RoomPage {
  visit(roomId: string) {
    cy.visit(`/room/${roomId}`);
    return this;
  }

  get loadingIndicator() {
    return cy.contains(/loading|bringing/i);
  }
}