import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessagesStatusBar } from './messages-status-bar';

describe('MessagesStatusBar', () => {
  let component: MessagesStatusBar;
  let fixture: ComponentFixture<MessagesStatusBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessagesStatusBar],
    }).compileComponents();

    fixture = TestBed.createComponent(MessagesStatusBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
