import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplatesPanel } from './templates-panel';

describe('TemplatesPanel', () => {
  let component: TemplatesPanel;
  let fixture: ComponentFixture<TemplatesPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplatesPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplatesPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
