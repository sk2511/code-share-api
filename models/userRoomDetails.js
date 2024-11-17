import sequelize from '../config/sequelize.js'
import { DataTypes } from 'sequelize'

const UserRoomDetails = sequelize.define(
  'user_room_details',
  {
    id: {
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      type: DataTypes.UUID,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    room_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    syntax: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updated_at: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'user_room_details',
  }
)

export default UserRoomDetails
