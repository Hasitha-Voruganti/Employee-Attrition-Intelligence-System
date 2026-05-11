"""
Pydantic models for API request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class PredictionRequest(BaseModel):
    """Single employee prediction request."""
    Age: int = Field(..., ge=18, le=65, description="Employee age")
    BusinessTravel: str = Field(..., description="Non-Travel | Travel_Rarely | Travel_Frequently")
    DailyRate: int = Field(..., ge=100, le=1500)
    Department: str = Field(..., description="Sales | Research & Development | Human Resources")
    DistanceFromHome: int = Field(..., ge=1, le=30)
    Education: int = Field(..., ge=1, le=5)
    EducationField: str = Field(...)
    EnvironmentSatisfaction: int = Field(..., ge=1, le=4)
    Gender: str = Field(..., description="Male | Female")
    HourlyRate: int = Field(..., ge=30, le=100)
    JobInvolvement: int = Field(..., ge=1, le=4)
    JobLevel: int = Field(..., ge=1, le=5)
    JobRole: str = Field(...)
    JobSatisfaction: int = Field(..., ge=1, le=4)
    MaritalStatus: str = Field(...)
    MonthlyIncome: int = Field(..., ge=1009, le=20000)
    MonthlyRate: int = Field(..., ge=2000, le=27000)
    NumCompaniesWorked: int = Field(..., ge=0, le=9)
    OverTime: str = Field(..., description="Yes | No")
    PercentSalaryHike: int = Field(..., ge=11, le=25)
    PerformanceRating: int = Field(..., ge=3, le=4)
    RelationshipSatisfaction: int = Field(..., ge=1, le=4)
    StockOptionLevel: int = Field(..., ge=0, le=3)
    TotalWorkingYears: int = Field(..., ge=0, le=40)
    TrainingTimesLastYear: int = Field(..., ge=0, le=6)
    WorkLifeBalance: int = Field(..., ge=1, le=4)
    YearsAtCompany: int = Field(..., ge=0, le=40)
    YearsInCurrentRole: int = Field(..., ge=0, le=18)
    YearsSinceLastPromotion: int = Field(..., ge=0, le=15)
    YearsWithCurrManager: int = Field(..., ge=0, le=17)

    class Config:
        json_schema_extra = {
            "example": {
                "Age": 35,
                "BusinessTravel": "Travel_Rarely",
                "DailyRate": 800,
                "Department": "Research & Development",
                "DistanceFromHome": 5,
                "Education": 3,
                "EducationField": "Life Sciences",
                "EnvironmentSatisfaction": 3,
                "Gender": "Male",
                "HourlyRate": 65,
                "JobInvolvement": 3,
                "JobLevel": 2,
                "JobRole": "Research Scientist",
                "JobSatisfaction": 4,
                "MaritalStatus": "Married",
                "MonthlyIncome": 5000,
                "MonthlyRate": 15000,
                "NumCompaniesWorked": 2,
                "OverTime": "No",
                "PercentSalaryHike": 14,
                "PerformanceRating": 3,
                "RelationshipSatisfaction": 3,
                "StockOptionLevel": 1,
                "TotalWorkingYears": 10,
                "TrainingTimesLastYear": 2,
                "WorkLifeBalance": 3,
                "YearsAtCompany": 5,
                "YearsInCurrentRole": 3,
                "YearsSinceLastPromotion": 1,
                "YearsWithCurrManager": 4
            }
        }


class PredictionResponse(BaseModel):
    prediction: int
    probability_attrition: float
    probability_retention: float
    risk_level: str
    model_used: str
    shap_explanation: Optional[Dict[str, Any]] = None
    risk_factors: List[str] = []
    recommendations: List[str] = []


class ModelMetrics(BaseModel):
    model: str
    accuracy: float
    f1_score: float
    roc_auc: float
    precision: float
    recall: float
    specificity: float
    cv_roc_auc_mean: float
    cv_roc_auc_std: float
    training_time: float
    is_best: bool


class TrainingResponse(BaseModel):
    status: str
    best_model: str
    comparison_table: List[Dict[str, Any]]
    training_time_total: float


class TrainingStatusResponse(BaseModel):
    status: str
    progress: int
    best_model: Optional[str] = None
    message: str
