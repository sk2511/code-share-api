import Sequelize from 'sequelize'
async function up({ context: queryInterface }) {
  await queryInterface.createTable('user_room_details', {
    id: {
      allowNull: false,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      type: Sequelize.UUID,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    room_id: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    syntax: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    code: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  })
}
async function down({ context: queryInterface }) {
  await queryInterface.dropTable('user_room_details')
}
export { up, down }
