import { act, renderHook } from "@testing-library/react";
import useLivestreamManager from "../useLivestreamManager";

describe("useLivestreamManager", () => {
  it("handles viewer selection lifecycle", () => {
    const { result } = renderHook(() => useLivestreamManager());
    expect(result.current.activeLivestream).toBeNull();

    const sampleStream = { livestreamId: "ls_test" };

    act(() => {
      result.current.openViewer(sampleStream);
    });
    expect(result.current.activeLivestream).toEqual(sampleStream);

    act(() => {
      result.current.closeViewer();
    });
    expect(result.current.activeLivestream).toBeNull();
  });

  it("manages broadcaster modal state and refresh key", () => {
    const { result } = renderHook(() => useLivestreamManager());
    expect(result.current.isBroadcasterOpen).toBe(false);
    expect(result.current.refreshKey).toBe(0);

    act(() => {
      result.current.openBroadcaster();
    });
    expect(result.current.isBroadcasterOpen).toBe(true);

    act(() => {
      result.current.closeBroadcaster();
    });
    expect(result.current.isBroadcasterOpen).toBe(false);
    expect(result.current.refreshKey).toBe(0);

    act(() => {
      result.current.openBroadcaster();
      result.current.closeBroadcaster({ refresh: true });
    });

    expect(result.current.isBroadcasterOpen).toBe(false);
    expect(result.current.refreshKey).toBe(1);
  });
});

