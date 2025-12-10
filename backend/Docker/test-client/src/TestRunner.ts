import { logger } from "./utils/logger.js";

/**
 * Test Runner
 * 
 * Executes test scenarios and generates reports
 */

export interface TestStep {
  name: string;
  status: "passed" | "failed";
  message?: string;
  error?: Error;
  duration: number;
}

export interface ScenarioResult {
  name: string;
  status: "passed" | "failed";
  duration: number;
  steps: TestStep[];
  error?: Error;
}

export interface TestReport {
  timestamp: string;
  duration: number;
  totalTests: number;
  passed: number;
  failed: number;
  scenarios: ScenarioResult[];
}

export type TestScenario = () => Promise<void>;

export class TestRunner {
  private results: ScenarioResult[] = [];

  /**
   * Run all test scenarios
   */
  async runAll(scenarios: Map<string, TestScenario>): Promise<TestReport> {
    logger.info("Starting test run...");
    const startTime = Date.now();

    for (const [name, scenario] of scenarios) {
      await this.runScenario(name, scenario);
    }

    const duration = Date.now() - startTime;
    const report = this.generateReport(duration);

    this.printReport(report);

    return report;
  }

  /**
   * Run a single test scenario
   */
  async runScenario(name: string, scenario: TestScenario): Promise<ScenarioResult> {
    logger.testStart(name);
    const startTime = Date.now();
    
    const result: ScenarioResult = {
      name,
      status: "passed",
      duration: 0,
      steps: [],
    };

    try {
      await scenario();
      result.status = "passed";
    } catch (error: any) {
      result.status = "failed";
      result.error = error;
      logger.error(`Test failed: ${error.message}`, error);
    } finally {
      result.duration = Date.now() - startTime;
      this.results.push(result);
      logger.testEnd(name, result.status === "passed");
    }

    return result;
  }

  /**
   * Log a test step
   */
  logTestStep(
    step: string,
    status: "success" | "failure",
    details?: any
  ): void {
    if (status === "success") {
      logger.success(`✓ ${step}`, details);
    } else {
      logger.error(`✗ ${step}`, details);
    }
  }

  /**
   * Generate test report
   */
  generateReport(duration: number): TestReport {
    const passed = this.results.filter((r) => r.status === "passed").length;
    const failed = this.results.filter((r) => r.status === "failed").length;

    return {
      timestamp: new Date().toISOString(),
      duration,
      totalTests: this.results.length,
      passed,
      failed,
      scenarios: this.results,
    };
  }

  /**
   * Print test report to console
   */
  private printReport(report: TestReport): void {
    console.log("\n" + "=".repeat(60));
    console.log("FRP Authentication Test Report");
    console.log("=".repeat(60));
    console.log(`Date: ${report.timestamp}`);
    console.log(`Duration: ${(report.duration / 1000).toFixed(2)}s`);
    console.log("");
    console.log("Summary:");
    console.log(`  Total Tests: ${report.totalTests}`);
    console.log(`  Passed: ${report.passed}`);
    console.log(`  Failed: ${report.failed}`);
    console.log("");
    console.log("Scenarios:");

    for (const scenario of report.scenarios) {
      const icon = scenario.status === "passed" ? "✅" : "❌";
      const duration = (scenario.duration / 1000).toFixed(2);
      console.log(`  ${icon} ${scenario.name} (${duration}s)`);
      
      if (scenario.error) {
        console.log(`     Error: ${scenario.error.message}`);
      }
    }

    console.log("=".repeat(60) + "\n");
  }

  /**
   * Save report to JSON file
   */
  async saveReportToFile(report: TestReport, filePath: string): Promise<void> {
    const fs = await import("fs/promises");
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf-8");
    logger.info(`Report saved to ${filePath}`);
  }

  /**
   * Reset results
   */
  reset(): void {
    this.results = [];
  }
}
