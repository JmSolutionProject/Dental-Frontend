import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScheduledMessagesPanel } from './scheduled-messages-panel';

describe('ScheduledMessagesPanel', () => {
  let component: ScheduledMessagesPanel;
  let fixture: ComponentFixture<ScheduledMessagesPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduledMessagesPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduledMessagesPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
