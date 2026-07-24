import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectMessageForm } from './direct-message-form';

describe('DirectMessageForm', () => {
  let component: DirectMessageForm;
  let fixture: ComponentFixture<DirectMessageForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectMessageForm],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectMessageForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
