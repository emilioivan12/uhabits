// Ported from uhabits-core/.../commands/CreateHabitCommandTest.kt

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ModelFactory } from "../modelFactory";
import { HabitFixtures } from "../testing/fixtures";
import { Reminder, WeekdayList } from "../models";
import { setFixedLocalTime } from "../timestamp";
import { CreateHabitCommand } from "./CreateHabitCommand";

const FIXED_LOCAL_TIME = 1422172800000;

describe("CreateHabitCommand", () => {
  beforeEach(() => setFixedLocalTime(FIXED_LOCAL_TIME));
  afterEach(() => setFixedLocalTime(null));

  it("adds the model habit to the list", () => {
    const factory = new ModelFactory();
    const habitList = factory.buildHabitList();
    const fixtures = new HabitFixtures(factory, habitList);

    const model = fixtures.createEmptyHabit();
    model.name = "New habit";
    model.reminder = new Reminder(8, 30, WeekdayList.EVERY_DAY);
    const command = new CreateHabitCommand(factory, habitList, model);

    expect(habitList.isEmpty).toBe(true);
    command.run();
    expect(habitList.size()).toBe(1);
    expect(habitList.getByPosition(0).name).toBe(model.name);
  });
});
