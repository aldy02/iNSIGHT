const sequelize = require('../config/db');

const User = require('./user');
const Plant = require('./plant');
const Area = require('./area');
const MainCategory = require('./mainCategory');
const SubCategory = require('./subCategory');
const Unit = require('./unit');
const Parameter = require('./parameter');
const KopParameter = require('./kopParameter');
const DailyReading = require('./dailyReading');
const DataSource = require('./dataSource');
const SourceColumn = require('./sourceColumn');

Plant.hasMany(Area, { foreignKey: 'plant_id', onDelete: 'CASCADE' });
Area.belongsTo(Plant, { foreignKey: 'plant_id' });

Area.hasMany(MainCategory, { foreignKey: 'area_id', onDelete: 'CASCADE' });
MainCategory.belongsTo(Area, { foreignKey: 'area_id' });

MainCategory.hasMany(SubCategory, { foreignKey: 'main_category_id', onDelete: 'CASCADE' });
SubCategory.belongsTo(MainCategory, { foreignKey: 'main_category_id' });

SubCategory.hasMany(Unit, { foreignKey: 'sub_category_id', onDelete: 'CASCADE' });
Unit.belongsTo(SubCategory, { foreignKey: 'sub_category_id' });

Unit.hasMany(KopParameter, { foreignKey: 'unit_id', onDelete: 'CASCADE' });
KopParameter.belongsTo(Unit, { foreignKey: 'unit_id' });

Parameter.hasMany(KopParameter, { foreignKey: 'parameter_id', onDelete: 'CASCADE' });
KopParameter.belongsTo(Parameter, { foreignKey: 'parameter_id' });

Unit.hasMany(DailyReading, { foreignKey: 'unit_id', onDelete: 'CASCADE' });
DailyReading.belongsTo(Unit, { foreignKey: 'unit_id' });

Parameter.hasMany(DailyReading, { foreignKey: 'parameter_id', onDelete: 'CASCADE' });
DailyReading.belongsTo(Parameter, { foreignKey: 'parameter_id' });

User.hasMany(DailyReading, { foreignKey: 'input_by', onDelete: 'SET NULL' });
DailyReading.belongsTo(User, { foreignKey: 'input_by', as: 'inputByUser' });

// Mapping sumber file
Plant.hasMany(DataSource, { foreignKey: 'plant_id', onDelete: 'CASCADE' });
DataSource.belongsTo(Plant, { foreignKey: 'plant_id' });

DataSource.hasMany(SourceColumn, { foreignKey: 'data_source_id', as: 'columns', onDelete: 'CASCADE' });
SourceColumn.belongsTo(DataSource, { foreignKey: 'data_source_id' });

Unit.hasMany(SourceColumn, { foreignKey: 'unit_id', onDelete: 'CASCADE' });
SourceColumn.belongsTo(Unit, { foreignKey: 'unit_id' });

Parameter.hasMany(SourceColumn, { foreignKey: 'parameter_id', onDelete: 'CASCADE' });
SourceColumn.belongsTo(Parameter, { foreignKey: 'parameter_id' });

module.exports = {
  sequelize,
  User,
  Plant,
  Area,
  MainCategory,
  SubCategory,
  Unit,
  Parameter,
  KopParameter,
  DailyReading,
  DataSource,
  SourceColumn,
};