"""
Preprocessing pipeline for IBM HR Analytics dataset.
Handles feature engineering, encoding, scaling, and train/test splitting.
"""
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, LabelEncoder, OrdinalEncoder
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from typing import Tuple, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Columns to drop (constants or leakage risks)
DROP_COLUMNS = ['EmployeeCount', 'EmployeeNumber', 'Over18', 'StandardHours']
TARGET_COLUMN = 'Attrition'

# Categorical columns
CATEGORICAL_COLS = [
    'BusinessTravel', 'Department', 'EducationField',
    'Gender', 'JobRole', 'MaritalStatus', 'OverTime'
]

# Ordinal columns (have a natural order)
ORDINAL_COLS = [
    'Education', 'EnvironmentSatisfaction', 'JobInvolvement',
    'JobLevel', 'JobSatisfaction', 'PerformanceRating',
    'RelationshipSatisfaction', 'StockOptionLevel', 'WorkLifeBalance'
]

# Numerical columns
NUMERICAL_COLS = [
    'Age', 'DailyRate', 'DistanceFromHome', 'HourlyRate',
    'MonthlyIncome', 'MonthlyRate', 'NumCompaniesWorked',
    'PercentSalaryHike', 'TotalWorkingYears', 'TrainingTimesLastYear',
    'YearsAtCompany', 'YearsInCurrentRole', 'YearsSinceLastPromotion',
    'YearsWithCurrManager'
]


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create meaningful derived features."""
    df = df.copy()
    
    # Tenure ratio
    df['TenureRatio'] = np.where(
        df['TotalWorkingYears'] > 0,
        df['YearsAtCompany'] / df['TotalWorkingYears'].clip(lower=1),
        0
    )
    
    # Income per year of experience
    df['IncomePerYearExp'] = df['MonthlyIncome'] / (df['TotalWorkingYears'].clip(lower=1))
    
    # Satisfaction composite score
    df['SatisfactionScore'] = (
        df['JobSatisfaction'] + df['EnvironmentSatisfaction'] +
        df['RelationshipSatisfaction'] + df['WorkLifeBalance']
    ) / 4.0
    
    # Years without promotion relative to tenure
    df['PromotionLag'] = df['YearsSinceLastPromotion'] / (df['YearsAtCompany'].clip(lower=1))
    
    # Manager stability
    df['ManagerStability'] = df['YearsWithCurrManager'] / (df['YearsAtCompany'].clip(lower=1))
    
    # Overtime binary
    df['OverTimeFlag'] = (df['OverTime'] == 'Yes').astype(int)
    
    # Frequent traveler flag
    df['FrequentTraveler'] = (df['BusinessTravel'] == 'Travel_Frequently').astype(int)
    
    # Low income flag (below 25th percentile)
    income_q25 = df['MonthlyIncome'].quantile(0.25)
    df['LowIncomeFlag'] = (df['MonthlyIncome'] < income_q25).astype(int)
    
    # Early career flag
    df['EarlyCareer'] = (df['TotalWorkingYears'] <= 3).astype(int)
    
    return df


def preprocess_dataframe(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Full preprocessing: drop cols, engineer features, encode target."""
    df = df.copy()
    
    # Drop irrelevant columns
    cols_to_drop = [c for c in DROP_COLUMNS if c in df.columns]
    df.drop(columns=cols_to_drop, inplace=True)
    
    # Encode target
    y = (df[TARGET_COLUMN] == 'Yes').astype(int)
    df.drop(columns=[TARGET_COLUMN], inplace=True)
    
    # Feature engineering
    df = engineer_features(df)
    
    return df, y


def build_preprocessing_pipeline() -> ColumnTransformer:
    """Build sklearn preprocessing pipeline."""
    # Extended feature list after engineering
    engineered_num_cols = NUMERICAL_COLS + [
        'TenureRatio', 'IncomePerYearExp', 'SatisfactionScore',
        'PromotionLag', 'ManagerStability', 'OverTimeFlag',
        'FrequentTraveler', 'LowIncomeFlag', 'EarlyCareer'
    ]
    
    numerical_pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    categorical_pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1))
    ])
    
    ordinal_pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('scaler', StandardScaler())
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numerical_pipeline, engineered_num_cols),
            ('cat', categorical_pipeline, CATEGORICAL_COLS),
            ('ord', ordinal_pipeline, ORDINAL_COLS),
        ],
        remainder='drop'
    )
    
    return preprocessor


def get_feature_names(preprocessor: ColumnTransformer) -> List[str]:
    """Extract feature names after transformation."""
    engineered_num_cols = NUMERICAL_COLS + [
        'TenureRatio', 'IncomePerYearExp', 'SatisfactionScore',
        'PromotionLag', 'ManagerStability', 'OverTimeFlag',
        'FrequentTraveler', 'LowIncomeFlag', 'EarlyCareer'
    ]
    return engineered_num_cols + CATEGORICAL_COLS + ORDINAL_COLS


def prepare_data(
    df: pd.DataFrame,
    test_size: float = 0.2,
    random_state: int = 42
) -> Dict[str, Any]:
    """Full data preparation pipeline."""
    X, y = preprocess_dataframe(df)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    
    preprocessor = build_preprocessing_pipeline()
    
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    feature_names = get_feature_names(preprocessor)
    
    logger.info(f"Data prepared: train={X_train_processed.shape}, test={X_test_processed.shape}")
    logger.info(f"Attrition rate - train: {y_train.mean():.2%}, test: {y_test.mean():.2%}")
    
    return {
        'X_train': X_train_processed,
        'X_test': X_test_processed,
        'y_train': y_train.values,
        'y_test': y_test.values,
        'X_train_raw': X_train,
        'X_test_raw': X_test,
        'preprocessor': preprocessor,
        'feature_names': feature_names,
        'n_features': X_train_processed.shape[1],
        'attrition_rate': float(y.mean()),
        'n_samples': len(df),
        'class_distribution': y.value_counts().to_dict()
    }
