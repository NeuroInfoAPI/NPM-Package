const scheduleTypes = new Set(["normal", "offline", "canceled", "TBD", "unknown"]);
const scheduleStatuses = new Set(["auto_twitch", "auto_discord", "confirmed"]);
const xFeedEntryTypes = new Set(["tweet", "reply", "retweet"]);

export function assertTwitchStreamData(data: Record<string, unknown>) {
  expect(typeof data.isLive).toBe("boolean");
  if (data.isLive) {
    expect(typeof data.id).toBe("string");
    expect(typeof data.title).toBe("string");
    expect(data.game).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
    });
    expect(typeof data.language).toBe("string");
    expect(Array.isArray(data.tags)).toBe(true);
    expect(typeof data.isMature).toBe("boolean");
    expect(typeof data.viewerCount).toBe("number");
    expect(typeof data.startedAt).toBe("number");
    expect(typeof data.thumbnailUrl).toBe("string");
  }
}

export function assertTwitchVod(data: Record<string, unknown>) {
  expect(typeof data.id).toBe("string");
  expect(typeof data.streamId).toBe("string");
  expect(typeof data.title).toBe("string");
  expect(typeof data.url).toBe("string");
  expect(typeof data.viewable).toBe("string");
  expect(typeof data.type).toBe("string");
  expect(typeof data.language).toBe("string");
  expect(typeof data.duration).toBe("string");
  expect(typeof data.viewCount).toBe("number");
  expect(typeof data.createdAt).toBe("number");
  expect(typeof data.publishedAt).toBe("number");
  expect(typeof data.thumbnailUrl).toBe("string");
}

export function assertScheduleEntry(entry: Record<string, unknown>) {
  expect(typeof entry.day).toBe("number");
  expect(typeof entry.time).toBe("number");
  expect(typeof entry.message).toBe("string");
  expect(scheduleTypes.has(entry.type as string)).toBe(true);
}

export function assertScheduleResponse(data: Record<string, unknown>) {
  expect(typeof data.year).toBe("number");
  expect(typeof data.week).toBe("number");
  expect(Array.isArray(data.schedule)).toBe(true);
  expect(scheduleStatuses.has(data.status as string)).toBe(true);
  for (const entry of data.schedule as Record<string, unknown>[]) {
    assertScheduleEntry(entry);
  }
}

export function assertScheduleLatestResponse(data: Record<string, unknown>) {
  assertScheduleResponse(data);
  expect(typeof data.hasActiveSubathon).toBe("boolean");
}

export function assertSubathonGoal(goal: Record<string, unknown>) {
  expect(typeof goal.name).toBe("string");
  expect(typeof goal.completed).toBe("boolean");
  expect(typeof goal.reached).toBe("boolean");
}

export function assertSubathonData(data: Record<string, unknown>) {
  expect(typeof data.year).toBe("number");
  expect(typeof data.name).toBe("string");
  expect(typeof data.subcount).toBe("number");
  expect(typeof data.goals).toBe("object");
  expect(typeof data.isActive).toBe("boolean");
  for (const goal of Object.values(data.goals as Record<string, Record<string, unknown>>)) {
    assertSubathonGoal(goal);
  }
}

export function assertBlogFeedData(data: Record<string, unknown>, expectRaw = false) {
  expect(typeof data.url).toBe("string");
  expect(typeof data.lastUpdated).toBe("number");
  expect(typeof data.title).toBe("string");
  expect(typeof data.subtitle).toBe("string");
  expect(Array.isArray(data.entries)).toBe(true);

  for (const entry of data.entries as Record<string, unknown>[]) {
    expect(typeof entry.title).toBe("string");
    expect(typeof entry.author).toBe("string");
    expect(typeof entry.url).toBe("string");
    expect(typeof entry.published).toBe("number");
    expect(typeof entry.updated).toBe("number");
    expect(typeof entry.summary).toBe("string");
    if (expectRaw) {
      expect(typeof entry.rawContent).toBe("string");
    }
  }
}

export function assertXFeedData(data: Record<string, unknown>, expectRaw = false) {
  const metadata = data.metadata as Record<string, unknown>;
  const placeholders = metadata.placeholders as Record<string, unknown>;
  expect(typeof placeholders.nitterHost).toBe("string");
  expect(Array.isArray(data.entries)).toBe(true);
  expect((data.entries as unknown[]).length).toBeGreaterThan(0);

  let hasRawContent = false;
  for (const entry of data.entries as Record<string, unknown>[]) {
    expect(typeof entry.id).toBe("string");
    expect(xFeedEntryTypes.has(entry.type as string)).toBe(true);
    expect(typeof (entry.author as Record<string, unknown>).username).toBe("string");
    expect(typeof entry.url).toBe("string");
    expect(typeof entry.createdTimestamp).toBe("number");
    expect(Array.isArray(entry.media)).toBe(true);

    if (entry.content != null) expect(typeof entry.content).toBe("string");
    if (entry.rawContent != null) {
      expect(typeof entry.rawContent).toBe("string");
      hasRawContent = true;
    }
    if (entry.replyTo != null) expect(typeof (entry.replyTo as Record<string, unknown>).username).toBe("string");
    if (entry.retweetedBy != null) expect(typeof (entry.retweetedBy as Record<string, unknown>).username).toBe("string");

    for (const media of entry.media as Record<string, unknown>[]) {
      expect(media.type === "image" || media.type === "video").toBe(true);
      expect(typeof media.url).toBe("string");
      if (media.posterUrl != null) expect(typeof media.posterUrl).toBe("string");
      if (media.mimeType != null) expect(typeof media.mimeType).toBe("string");
    }
  }

  if (expectRaw) expect(hasRawContent).toBe(true);
}
