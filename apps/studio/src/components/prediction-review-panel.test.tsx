import { render, screen } from "@testing-library/react"
import { PredictionReviewPanel } from "@/components/prediction-review-panel"

const basePrediction = {
  id: "prediction-1",
  name: "person",
  type: "box",
  coordinates: [
    { x: 10, y: 10 },
    { x: 30, y: 30 },
  ],
  confidence: 0.92,
  labelName: "person",
  label_name: "person",
  labelColor: "#22c55e",
  label_color: "#22c55e",
}

describe("PredictionReviewPanel", () => {
  it("flags predictions that will create a new project label", () => {
    render(
      <PredictionReviewPanel
        predictions={[basePrediction]}
        labels={[]}
        onAccept={jest.fn(async () => {})}
        onReject={jest.fn(async () => {})}
      />
    )

    expect(
      screen.getByText("Accepting this will create a new project label.")
    ).toBeTruthy()
  })

  it("does not flag predictions when a matching label already exists", () => {
    render(
      <PredictionReviewPanel
        predictions={[basePrediction]}
        labels={[
          {
            id: "label-1",
            name: "Person",
            color: "#22c55e",
            projectId: "project-1",
            project_id: "project-1",
          },
        ]}
        onAccept={jest.fn(async () => {})}
        onReject={jest.fn(async () => {})}
      />
    )

    expect(
      screen.queryByText("Accepting this will create a new project label.")
    ).toBeNull()
  })
})
